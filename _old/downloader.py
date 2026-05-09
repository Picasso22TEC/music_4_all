import io
import json
import re
import html
import base64
import subprocess
import zipfile
import requests
import threading
import tempfile
import atexit
import shutil
import time
from functools import wraps
from datetime import datetime
from typing import Optional, Tuple, Callable, Union, Dict, List
from pathlib import Path

import tidalapi
from tidalapi.session import Session
from tidalapi.media import Quality
from mutagen.flac import FLAC, Picture
from mutagen.mp4 import MP4, MP4Cover  # Sprint 4


# ==========================================
# SPRINT 2 — Decorador de reintentos con backoff
# ==========================================
def retry(max_retries=3, backoff_factor=1.5, cancel_event=None):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cancel_evt = kwargs.get('cancel_event', None) or cancel_event
            last_exception = None
            for attempt in range(max_retries):
                try:
                    if cancel_evt and cancel_evt.is_set():
                        raise RuntimeWarning("Cancelado por el usuario")
                    return func(*args, **kwargs)
                except requests.exceptions.HTTPError as e:
                    if e.response is not None and e.response.status_code == 429:
                        retry_after = int(e.response.headers.get("Retry-After", 5))
                        time.sleep(retry_after)
                        continue
                    raise
                except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        sleep_time = backoff_factor ** attempt
                        time.sleep(sleep_time)
                        continue
                    raise last_exception
                except RuntimeWarning:
                    raise
            if last_exception:
                raise last_exception
        return wrapper
    return decorator


class TidalDownloader:
    FFMPEG_BIN = Path("ffmpeg.exe")

    def __init__(self, log_callback=print, session_data: Optional[Dict] = None):
        self.log = log_callback
        self.quality = Quality.hi_res_lossless
        self.session = self._load_session(session_data)
        # Sprint 1
        self._temp_dir = None
        self._setup_temp_dir()

    # ==========================================
    # SPRINT 1 — Gestión de directorio temporal
    # ==========================================
    def _setup_temp_dir(self):
        self._temp_dir = Path(tempfile.mkdtemp(prefix="tidal_dl_"))
        atexit.register(self._cleanup_temp_dir)
        self.log(f"📁 Directorio temporal de descargas: {self._temp_dir}")

    def _cleanup_temp_dir(self):
        if self._temp_dir and self._temp_dir.exists():
            shutil.rmtree(self._temp_dir, ignore_errors=True)
            self.log("🧹 Directorio temporal eliminado.")

    @property
    def download_folder(self) -> Path:
        return self._temp_dir

    # ==========================================
    # SESIÓN Y AUTENTICACIÓN
    # ==========================================
    def _load_session(self, session_data: Optional[Dict]) -> Session:
        session = Session()
        if session_data:
            try:
                expiry = datetime.fromisoformat(session_data['expiry_time'])
                session.load_oauth_session(
                    session_data['token_type'],
                    session_data['access_token'],
                    session_data['refresh_token'],
                    expiry
                )
            except Exception as e:
                self.log(f"⚠️ Error cargando sesión desde memoria: {str(e)}")
        return session

    def get_session_data(self) -> Optional[Dict]:
        if self.session and self.session.check_login():
            return {
                'token_type': self.session.token_type,
                'access_token': self.session.access_token,
                'refresh_token': self.session.refresh_token,
                'expiry_time': self.session.expiry_time.isoformat()
            }
        return None

    def check_auth(self) -> bool:
        if not self.session:
            return False
        try:
            if self.session.check_login():
                return True
            else:
                if self.session.refresh_token and self.session.token_refresh(self.session.refresh_token):
                    return True
        except requests.exceptions.RequestException:
            return False
        except Exception as e:
            self.log(f"⚠️ Error verificando estado de sesión: {str(e)}")
        return False

    # ==========================================
    # PARSEO Y SANITIZACIÓN
    # ==========================================
    def parse_link(self, link: str) -> Tuple[Optional[str], Optional[str]]:
        if not link or not isinstance(link, str):
            return None, None
        if 'track/' in link:
            match = re.search(r'track/(\d+)', link)
            return 'track', int(match.group(1)) if match else None
        elif 'album/' in link:
            match = re.search(r'album/(\d+)', link)
            return 'album', int(match.group(1)) if match else None
        elif 'playlist/' in link:
            match = re.search(r'playlist/([0-9a-fA-F\-]+)', link)
            return 'playlist', match.group(1) if match else None
        return None, None

    def _sanitize_filename(self, name: str) -> str:
        if not name:
            return "Unknown"
        cleaned = re.sub(r'[\\/*?:"<>|]', "-", name)
        return cleaned.strip()

    def _clean_title_for_search(self, name: str) -> str:
        if not name:
            return ""
        patterns = [
            r"\(feat\..*?\)", r"\(ft\..*?\)", r"\(featuring.*?\)", r"\(with.*?\)",
            r"-\s*Remaster(ed)?.*$", r"-\s*\d{4}\s*Remaster.*$",
            r"\(Remaster(ed)?.*?\)", r"\(Deluxe.*?\)", r"\(Bonus.*?\)",
            r"\(Live.*?\)", r"\(Radio Edit\)", r"\(Single Version\)"
        ]
        res = name
        for p in patterns:
            res = re.sub(p, "", res, flags=re.IGNORECASE)
        return res.strip()

    # ==========================================
    # SPRINT 2 — _fetch_lyrics con reintentos
    # ==========================================
    @retry(max_retries=2)
    def _fetch_lyrics(self, artist: str, track_name: str, cancel_event=None) -> Tuple[str, str]:
        clean_track = self._clean_title_for_search(track_name)
        headers = {"User-Agent": "Music4All-App/1.0"}

        try:
            r = requests.get(
                "https://lrclib.net/api/get",
                params={"artist_name": artist, "track_name": clean_track},
                headers=headers,
                timeout=5
            )
            r.raise_for_status()
            data = r.json()
            synced = data.get("syncedLyrics") or ""
            plain = data.get("plainLyrics") or ""
            if synced:
                return synced, ""
            if plain:
                return "", plain
        except requests.exceptions.RequestException:
            pass

        if clean_track != track_name:
            try:
                r = requests.get(
                    "https://lrclib.net/api/get",
                    params={"artist_name": artist, "track_name": track_name},
                    headers=headers,
                    timeout=5
                )
                r.raise_for_status()
                data = r.json()
                synced = data.get("syncedLyrics") or ""
                plain = data.get("plainLyrics") or ""
                if synced:
                    return synced, ""
                if plain:
                    return "", plain
            except requests.exceptions.RequestException:
                pass

        return "", ""

    # ==========================================
    # CLASIFICACIÓN DE CALIDAD
    # ==========================================
    def _classify_quality(self, sample_rate: int, bit_depth: int) -> Tuple[str, str]:
        if bit_depth <= 16 and sample_rate <= 44100:
            return "HIFI", f"{sample_rate / 1000:g}kHz / {bit_depth}bit"
        if bit_depth == 24 and sample_rate == 44100:
            return "HIFI", "44.1kHz / 24bit"
        if bit_depth >= 24 and sample_rate >= 48000:
            return "MAX", f"{sample_rate / 1000:g}kHz / {bit_depth}bit"
        return "HIFI", f"{sample_rate / 1000:g}kHz / {bit_depth}bit"

    def _probe_quality_from_manifest(self, track_id: int) -> Tuple[str, str]:
        try:
            self.session.audio_quality = Quality.hi_res_lossless
            track = self.session.track(track_id)
            stream = track.get_stream()

            if stream.manifest_mime_type == "application/vnd.tidal.bts":
                decoded = base64.b64decode(stream.manifest).decode('utf-8')
                manifest = json.loads(decoded)
                aq = manifest.get('audioQuality', 'LOSSLESS').upper()
                if aq in ('HI_RES', 'HI_RES_LOSSLESS'):
                    return "MAX", "Hi-Res"
                if aq == 'LOSSLESS':
                    return "HIFI", "Lossless"
                return "HIFI", aq

            if hasattr(stream, 'audio_quality'):
                aq = str(stream.audio_quality).upper()
                if 'HI_RES' in aq or 'MASTER' in aq:
                    return "MAX", "Hi-Res"

            return "HIFI", "Lossless"
        except Exception:
            return "HIFI", "Lossless"

    # ==========================================
    # METADATOS (con detección de MQA/ATMOS para preview)
    # ==========================================
    def get_metadata(self, link: str) -> dict:
        if not self.check_auth():
            return {"error": "Sin Conexión a Tidal. Revisa tu internet o vuelve a iniciar sesión."}

        kind, item_id = self.parse_link(link)
        if not kind or not item_id:
            return {"error": "Enlace no reconocido. Asegúrate de que sea un link válido de Tidal."}

        try:
            if kind == 'track':
                track = self.session.track(item_id)
                album = self.session.album(track.album.id)
                cover_id = album.cover or ""
                year = str(album.release_date.year) if album.release_date else "Unknown"
                folder_name = self._sanitize_filename(f"{album.artist.name} - [{year}] {album.name}")

                # Obtenemos info de calidad incluyendo posible MQA/Atmos
                badge_title, badge_desc = self._probe_quality_from_manifest(item_id)
                # Analizamos el manifiesto para detectar Atmos (si está disponible)
                try:
                    stream = track.get_stream()
                    if stream.manifest_mime_type == "application/vnd.tidal.bts":
                        decoded = base64.b64decode(stream.manifest).decode('utf-8')
                        js = json.loads(decoded)
                        audio_quality = js.get('audioQuality', '').upper()
                        codec = js.get('codec', '').lower()
                        encryption = js.get('encryptionType', '')
                        is_atmos = audio_quality == 'ATMOS' or codec in ('ec-3', 'ac-4', 'eac3', 'atmos')
                        is_mqa = (encryption == 'MQA_DECODER' or codec in ('mqa', 'mqa_flac')) and audio_quality not in ('LOW', 'HIGH', 'LOW_LOSSLESS')
                        if is_atmos:
                            badge_title = "ATMOS"
                            badge_desc = "Dolby Atmos"
                        elif is_mqa:
                            badge_title = "MQA"
                            badge_desc = "Master Quality Authenticated"
                    else:
                        is_mqa = False
                        is_atmos = False
                except Exception:
                    is_mqa = False
                    is_atmos = False

                return {
                    "type": "track",
                    "title": track.name,
                    "artist": track.artist.name,
                    "album": album.name,
                    "thumb_url": f"https://resources.tidal.com/images/{cover_id.replace('-', '/')}/320x320.jpg" if cover_id else None,
                    "hires_url": f"https://resources.tidal.com/images/{cover_id.replace('-', '/')}/1280x1280.jpg" if cover_id else None,
                    "items": [track],
                    "folder": folder_name,
                    "year": year,
                    "quality_badge": badge_title,
                    "quality_desc": badge_desc,
                    "tracks_count": 1,
                    "audio_format": "ATMOS" if is_atmos else ("MQA" if is_mqa else "FLAC")
                }

            elif kind == 'album':
                album = self.session.album(item_id)
                tracks = album.tracks()
                if not tracks:
                    return {"error": "El álbum no contiene canciones o no está disponible en tu región."}

                cover_id = album.cover or ""
                year = str(album.release_date.year) if album.release_date else "Unknown"
                folder_name = self._sanitize_filename(f"{album.artist.name} - [{year}] {album.name}")
                badge_title, badge_desc = self._probe_quality_from_manifest(tracks[0].id)

                return {
                    "type": "album",
                    "title": album.name,
                    "artist": album.artist.name,
                    "thumb_url": f"https://resources.tidal.com/images/{cover_id.replace('-', '/')}/320x320.jpg" if cover_id else None,
                    "hires_url": f"https://resources.tidal.com/images/{cover_id.replace('-', '/')}/1280x1280.jpg" if cover_id else None,
                    "items": tracks,
                    "folder": folder_name,
                    "year": year,
                    "tracks_count": album.num_tracks,
                    "quality_badge": badge_title,
                    "quality_desc": badge_desc,
                    "audio_format": "FLAC"
                }

            elif kind == 'playlist':
                playlist = self.session.playlist(item_id)
                tracks = playlist.tracks(limit=None)
                if not tracks:
                    return {"error": "La playlist está vacía o es privada."}

                thumb = None
                hires = None
                if hasattr(playlist, 'picture') and playlist.picture and isinstance(playlist.picture, str):
                    thumb = f"https://resources.tidal.com/images/{playlist.picture.replace('-', '/')}/320x320.jpg"
                    hires = f"https://resources.tidal.com/images/{playlist.picture.replace('-', '/')}/1280x1280.jpg"

                if not thumb and len(tracks) > 0:
                    try:
                        first = tracks[0]
                        if hasattr(first, 'album') and first.album and first.album.cover:
                            thumb = f"https://resources.tidal.com/images/{first.album.cover.replace('-', '/')}/80x80.jpg"
                            hires = f"https://resources.tidal.com/images/{first.album.cover.replace('-', '/')}/1280x1280.jpg"
                    except Exception:
                        pass

                badge_title = "PLAYLIST"
                badge_desc = "MIXED"
                if tracks:
                    bt, _ = self._probe_quality_from_manifest(tracks[0].id)
                    if bt == "MAX":
                        badge_title = "MAX"

                folder_name = self._sanitize_filename(f"Playlist - {playlist.name}")
                return {
                    "type": "playlist",
                    "title": playlist.name,
                    "artist": "Varios Artistas",
                    "thumb_url": thumb,
                    "hires_url": hires,
                    "items": tracks,
                    "folder": folder_name,
                    "year": "Playlist",
                    "tracks_count": playlist.num_tracks,
                    "quality_badge": badge_title,
                    "quality_desc": badge_desc,
                    "audio_format": "FLAC"
                }

        except tidalapi.exceptions.UserNotLoggedIn:
            return {"error": "Token expirado. Por favor, vuelve a iniciar sesión en Tidal."}
        except tidalapi.exceptions.ItemNotFound:
            return {"error": "Elemento no encontrado (Quizás fue borrado o es privado)."}
        except requests.exceptions.ConnectionError:
            return {"error": "Error de Red: No se pudo conectar a Tidal. Verifica tu conexión a internet."}
        except requests.exceptions.Timeout:
            return {"error": "Error de Red: Tidal tardó demasiado en responder (Timeout)."}
        except Exception as e:
            return {"error": f"Error inesperado: {str(e)}"}

    # ==========================================
    # SPRINT 2 — _download_cover con reintentos
    # ==========================================
    @retry(max_retries=2)
    def _download_cover(self, album_obj, output_path: Path, cancel_event=None):
        if output_path.exists():
            return
        try:
            if hasattr(album_obj, 'cover') and album_obj.cover:
                cover_url = f"https://resources.tidal.com/images/{album_obj.cover.replace('-', '/')}/1280x1280.jpg"
                r = requests.get(cover_url, timeout=10)
                r.raise_for_status()
                with output_path.open("wb") as f:
                    f.write(r.content)
        except Exception:
            pass

    # ==========================================
    # SPRINT 3 & 4 — _get_stream_url_and_type con detección de MQA y Atmos
    # ==========================================
    @retry(max_retries=2)
    def _get_stream_url_and_type(self, track_obj):
        try:
            self.session.audio_quality = self.quality
            stream = track_obj.get_stream()
        except tidalapi.exceptions.AssetNotReadyForPlayback:
            return None, None, "DASH", False, False
        except requests.exceptions.RequestException:
            return None, None, "Error de red al solicitar el stream", False, False
        except Exception as e:
            return None, None, f"Error obteniendo stream: {str(e)}", False, False

        is_mqa = False
        is_atmos = False

        if stream.manifest_mime_type == "application/dash+xml":
            xml = base64.b64decode(stream.manifest).decode('utf-8') if not stream.manifest.startswith('<') else stream.manifest
            try:
                url_init = html.unescape(re.search(r'initialization="([^"]+)"', xml).group(1))
                url_media = html.unescape(re.search(r'media="([^"]+)"', xml).group(1))
                return url_init, url_media, "DASH", False, False
            except Exception as e:
                return None, None, f"Error en manifiesto DASH: {str(e)}", False, False

        elif stream.manifest_mime_type == "application/vnd.tidal.bts":
            try:
                decoded = base64.b64decode(stream.manifest).decode('utf-8')
                js = json.loads(decoded)
                urls = js.get('urls')
                if not urls:
                    return None, None, "Manifiesto BTS sin URLs.", False, False

                codec = js.get('codec', '').lower()
                encryption = js.get('encryptionType', '')
                audio_quality = js.get('audioQuality', '').upper()

                # MQA
                if encryption == 'MQA_DECODER' or codec in ('mqa', 'mqa_flac'):
                    if audio_quality not in ('LOW', 'HIGH', 'LOW_LOSSLESS'):
                        is_mqa = True

                # Dolby Atmos
                if audio_quality == 'ATMOS' or codec in ('ec-3', 'ac-4', 'eac3', 'atmos'):
                    is_atmos = True

                return None, urls[0], "DIRECT", is_mqa, is_atmos
            except Exception as e:
                return None, None, f"Error en manifiesto BTS: {str(e)}", False, False

        return None, None, f"Formato desconocido: {stream.manifest_mime_type}", False, False

    # ==========================================
    # SPRINT 2 & 3 — descargas raw
    # ==========================================
    @retry(max_retries=2)
    def _download_raw_audio(self, url_init, url_media, method, output_path: Path,
                            progress_callback=None, cancel_event: threading.Event = None):
        try:
            with output_path.open("wb") as f_out:
                if method == "DASH":
                    init_req = requests.get(url_init, timeout=15)
                    init_req.raise_for_status()
                    f_out.write(init_req.content)

                    seg = 1
                    while seg < 300:
                        if cancel_event and cancel_event.is_set():
                            return False, "Cancelado por el usuario"
                        url = url_media.replace("$Number$", str(seg))
                        r = requests.get(url, timeout=10)
                        if r.status_code == 404 or len(r.content) < 100:
                            break
                        r.raise_for_status()
                        f_out.write(r.content)
                        seg += 1
                        if progress_callback:
                            progress_callback(min(seg / 50.0, 0.99))

                elif method == "DIRECT":
                    response = requests.get(url_media, stream=True, timeout=15)
                    response.raise_for_status()
                    total_length = int(response.headers.get('content-length', 0))
                    dl = 0
                    for chunk in response.iter_content(chunk_size=8192):
                        if cancel_event and cancel_event.is_set():
                            return False, "Cancelado por el usuario"
                        if chunk:
                            dl += len(chunk)
                            f_out.write(chunk)
                            if progress_callback and total_length > 0:
                                progress_callback(dl / total_length)
            return True, ""
        except requests.exceptions.ConnectionError:
            return False, "Conexión perdida durante la descarga."
        except requests.exceptions.Timeout:
            return False, "Tiempo de espera agotado."
        except IOError as e:
            return False, f"Error de escritura en disco: {str(e)}"
        except Exception as e:
            return False, f"Error en descarga: {str(e)}"

    @retry(max_retries=2)
    def _download_raw_mqa(self, url_media: str, output_path: Path,
                          progress_callback=None, cancel_event=None):
        try:
            response = requests.get(url_media, stream=True, timeout=15)
            response.raise_for_status()
            total_length = int(response.headers.get('content-length', 0))
            dl = 0
            with output_path.open("wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if cancel_event and cancel_event.is_set():
                        return False, "Cancelado por el usuario"
                    if chunk:
                        dl += len(chunk)
                        f.write(chunk)
                        if progress_callback and total_length > 0:
                            progress_callback(dl / total_length)
            return True, ""
        except requests.exceptions.ConnectionError:
            return False, "Conexión perdida durante la descarga MQA."
        except requests.exceptions.Timeout:
            return False, "Tiempo de espera agotado."
        except Exception as e:
            return False, f"Error en descarga MQA: {str(e)}"

    @retry(max_retries=2)
    def _download_raw_atmos(self, url_media: str, output_path: Path,
                            progress_callback=None, cancel_event=None):
        try:
            response = requests.get(url_media, stream=True, timeout=15)
            response.raise_for_status()
            total_length = int(response.headers.get('content-length', 0))
            dl = 0
            with output_path.open("wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if cancel_event and cancel_event.is_set():
                        return False, "Cancelado por el usuario"
                    if chunk:
                        dl += len(chunk)
                        f.write(chunk)
                        if progress_callback and total_length > 0:
                            progress_callback(dl / total_length)
            return True, ""
        except requests.exceptions.ConnectionError:
            return False, "Conexión perdida durante la descarga Atmos."
        except requests.exceptions.Timeout:
            return False, "Tiempo de espera agotado."
        except Exception as e:
            return False, f"Error en descarga Atmos: {str(e)}"

    # ==========================================
    # FFMPEG (para FLAC normal)
    # ==========================================
    def _process_ffmpeg(self, raw_path: Path, final_path: Path):
        if not self.FFMPEG_BIN.exists():
            return False, "Falta ffmpeg.exe."
        cmd = [
            str(self.FFMPEG_BIN), '-y', '-i', str(raw_path),
            '-compression_level', '5', '-loglevel', 'error', str(final_path)
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True)
            return True, ""
        except subprocess.CalledProcessError as e:
            return False, f"Error FFMPEG: {e.stderr}"
        except Exception as e:
            return False, f"Error FFMPEG: {str(e)}"

    # ==========================================
    # TAGS (FLAC, MQA, ATMOS)
    # ==========================================
    def _apply_tags(self, file_path: Path, track, album, cover_path: Path,
                    synced_lyrics: str = "", plain_lyrics: str = ""):
        try:
            audio = FLAC(str(file_path))

            audio['TITLE'] = [str(track.name) if track.name else "Unknown Title"]
            audio['ARTIST'] = [str(track.artist.name) if (track.artist and track.artist.name) else "Unknown Artist"]
            audio['ALBUM'] = [str(album.name) if album.name else "Unknown Album"]

            album_artist = (
                str(album.artist.name)
                if (hasattr(album, 'artist') and album.artist and album.artist.name)
                else str(track.artist.name) if (track.artist and track.artist.name)
                else "Unknown Artist"
            )
            audio['ALBUMARTIST'] = [album_artist]

            audio['TRACKNUMBER'] = [str(track.track_num) if track.track_num else "1"]
            audio['TRACKTOTAL'] = [str(album.num_tracks) if album.num_tracks else "1"]

            if hasattr(track, 'volume_num') and track.volume_num:
                audio['DISCNUMBER'] = [str(track.volume_num)]
            if hasattr(album, 'num_volumes') and album.num_volumes and album.num_volumes > 1:
                audio['DISCTOTAL'] = [str(album.num_volumes)]

            if hasattr(album, 'copyright') and album.copyright:
                audio['COPYRIGHT'] = [str(album.copyright)]

            if album.release_date:
                audio['DATE'] = [str(album.release_date)]
                audio['YEAR'] = [str(album.release_date.year)]

            if synced_lyrics:
                audio['LYRICS'] = [synced_lyrics]
            elif plain_lyrics:
                audio['UNSYNCEDLYRICS'] = [plain_lyrics]

            s_rate = audio.info.sample_rate
            s_bits = audio.info.bits_per_sample
            badge_title, badge_desc = self._classify_quality(s_rate, s_bits)
            calidad_txt = badge_desc
            if badge_title == "MAX":
                calidad_txt += " (Hi-Res)"

            audio['COMMENT'] = [f"Tidal Rip | {calidad_txt}"]

            if cover_path.exists():
                try:
                    img = Picture()
                    img.type = 3
                    img.mime = 'image/jpeg'
                    with cover_path.open("rb") as f:
                        img.data = f.read()
                    audio.add_picture(img)
                except IOError:
                    pass

            audio.save()
            return True, calidad_txt, s_rate, s_bits

        except Exception as e:
            return False, f"Error Tags: {str(e)}", 44100, 16

    def _apply_tags_mqa(self, file_path: Path, track, album, cover_path: Path,
                        synced_lyrics="", plain_lyrics=""):
        try:
            audio = FLAC(str(file_path))
            audio.delete()

            audio['TITLE'] = [str(track.name) if track.name else "Unknown Title"]
            audio['ARTIST'] = [str(track.artist.name) if (track.artist and track.artist.name) else "Unknown Artist"]
            audio['ALBUM'] = [str(album.name) if album.name else "Unknown Album"]

            album_artist = (
                str(album.artist.name)
                if (hasattr(album, 'artist') and album.artist and album.artist.name)
                else str(track.artist.name) if (track.artist and track.artist.name)
                else "Unknown Artist"
            )
            audio['ALBUMARTIST'] = [album_artist]
            audio['TRACKNUMBER'] = [str(track.track_num) if track.track_num else "1"]
            audio['TRACKTOTAL'] = [str(album.num_tracks) if album.num_tracks else "1"]

            if hasattr(track, 'volume_num') and track.volume_num:
                audio['DISCNUMBER'] = [str(track.volume_num)]
            if hasattr(album, 'num_volumes') and album.num_volumes and album.num_volumes > 1:
                audio['DISCTOTAL'] = [str(album.num_volumes)]

            if hasattr(album, 'copyright') and album.copyright:
                audio['COPYRIGHT'] = [str(album.copyright)]

            if album.release_date:
                audio['DATE'] = [str(album.release_date)]
                audio['YEAR'] = [str(album.release_date.year)]

            if synced_lyrics:
                audio['LYRICS'] = [synced_lyrics]
            elif plain_lyrics:
                audio['UNSYNCEDLYRICS'] = [plain_lyrics]

            audio['COMMENT'] = ["Tidal MQA Stream (bit-perfect)"]

            if cover_path.exists():
                try:
                    img = Picture()
                    img.type = 3
                    img.mime = 'image/jpeg'
                    with cover_path.open("rb") as f:
                        img.data = f.read()
                    audio.add_picture(img)
                except IOError:
                    pass

            audio.save()
        except Exception as e:
            self.log(f"⚠️ No se pudieron aplicar tags MQA: {e}")

    def _apply_tags_atmos(self, file_path: Path, track, album, cover_path: Path):
        try:
            audio = MP4(str(file_path))
            audio['\xa9nam'] = track.name
            audio['\xa9ART'] = track.artist.name
            audio['\xa9alb'] = album.name
            audio['aART'] = album.artist.name if album.artist else track.artist.name
            if track.track_num:
                audio['trkn'] = [(track.track_num, album.num_tracks)]
            if album.release_date:
                audio['\xa9day'] = str(album.release_date)

            if cover_path.exists():
                with open(cover_path, 'rb') as f:
                    cover_data = f.read()
                audio['covr'] = [MP4Cover(cover_data, imageformat=MP4Cover.FORMAT_JPEG)]

            audio.save()
        except Exception as e:
            self.log(f"⚠️ No se pudieron aplicar tags Atmos: {e}")

    # ==========================================
    # DESCARGA DE UNA SOLA CANCIÓN (con MQA y Atmos)
    # ==========================================
    def download_single_track(self, track_obj, folder_name: str = "",
                               progress_callback: Callable = None,
                               cancel_event: threading.Event = None):
        try:
            if folder_name:
                folder_path = self.download_folder / folder_name
            else:
                folder_path = self.download_folder

            try:
                folder_path.mkdir(parents=True, exist_ok=True)
            except OSError as e:
                return False, f"Error al crear carpeta: {str(e)}", "", 0, 0

            safe_name = self._sanitize_filename(track_obj.name)
            safe_track_num = track_obj.track_num if track_obj.track_num else 1

            # Nombres de archivo
            standard_filename = f"{safe_track_num:02d}. {safe_name}.flac"
            standard_path = folder_path / standard_filename
            mqa_filename = f"{safe_track_num:02d}. {safe_name}.mqa.flac"
            mqa_path = folder_path / mqa_filename
            atmos_filename = f"{safe_track_num:02d}. {safe_name}.mp4"
            atmos_path = folder_path / atmos_filename

            # Si existe el FLAC normal, lo devolvemos (el MQA/Atmos se comprueban en su rama)
            if standard_path.exists():
                try:
                    meta = FLAC(str(standard_path))
                    if progress_callback:
                        progress_callback(1.0)
                    return True, str(standard_path), "EXISTE", meta.info.sample_rate, meta.info.bits_per_sample
                except Exception:
                    pass

            try:
                album = self.session.album(track_obj.album.id)
            except Exception as e:
                return False, f"Error info álbum: {str(e)}", "", 0, 0

            cover_filename = self._sanitize_filename(f"cover_{album.id}.jpg")
            cover_path = folder_path / cover_filename
            self._download_cover(album, cover_path, cancel_event=cancel_event)

            synced_lyrics, plain_lyrics = self._fetch_lyrics(
                track_obj.artist.name, track_obj.name, cancel_event=cancel_event
            )

            url_init, url_media, method, is_mqa, is_atmos = self._get_stream_url_and_type(track_obj)
            if url_init is None and url_media is None:
                return False, f"Stream Error: {method}", "", 0, 0

            # --- DOLBY ATMOS ---
            if is_atmos:
                if atmos_path.exists():
                    if progress_callback:
                        progress_callback(1.0)
                    return True, str(atmos_path), "ATMOS", 0, 0

                temp_atmos = folder_path / f"temp_atmos_{track_obj.id}.mp4"
                dl_ok, dl_err = self._download_raw_atmos(
                    url_media, temp_atmos, progress_callback, cancel_event
                )
                if not dl_ok:
                    if temp_atmos.exists():
                        temp_atmos.unlink()
                    return False, dl_err, "", 0, 0

                shutil.move(str(temp_atmos), str(atmos_path))

                try:
                    self._apply_tags_atmos(atmos_path, track_obj, album, cover_path)
                except Exception as e:
                    return False, f"Error aplicando tags Atmos: {e}", 0, 0

                if progress_callback:
                    progress_callback(1.0)
                return True, str(atmos_path), "ATMOS", 0, 0

            # --- MQA ---
            elif is_mqa:
                if mqa_path.exists():
                    try:
                        meta = FLAC(str(mqa_path))
                        if progress_callback:
                            progress_callback(1.0)
                        s_rate = meta.info.sample_rate
                        s_bits = meta.info.bits_per_sample
                        return True, str(mqa_path), f"MQA {s_rate/1000:g}kHz/{s_bits}bit", s_rate, s_bits
                    except Exception:
                        pass

                temp_mqa = folder_path / f"temp_mqa_{track_obj.id}.flac"
                dl_ok, dl_err = self._download_raw_mqa(
                    url_media, temp_mqa, progress_callback, cancel_event
                )
                if not dl_ok:
                    if temp_mqa.exists():
                        temp_mqa.unlink()
                    return False, dl_err, "", 0, 0

                shutil.move(str(temp_mqa), str(mqa_path))

                try:
                    self._apply_tags_mqa(mqa_path, track_obj, album, cover_path,
                                        synced_lyrics, plain_lyrics)
                except Exception as e:
                    return False, f"Error aplicando tags MQA: {e}", 0, 0

                try:
                    audio = FLAC(str(mqa_path))
                    s_rate = audio.info.sample_rate
                    s_bits = audio.info.bits_per_sample
                    q_txt = f"MQA {s_rate/1000:g}kHz/{s_bits}bit"
                except Exception:
                    s_rate, s_bits = 44100, 24
                    q_txt = "MQA"

                if progress_callback:
                    progress_callback(1.0)
                return True, str(mqa_path), q_txt, s_rate, s_bits

            # --- FLAC NORMAL ---
            else:
                temp_raw = folder_path / f"temp_{track_obj.id}.flac"
                dl_ok, dl_err = self._download_raw_audio(
                    url_init, url_media, method, temp_raw, progress_callback, cancel_event
                )
                if not dl_ok:
                    if temp_raw.exists():
                        temp_raw.unlink()
                    return False, dl_err, "", 0, 0

                ff_ok, ff_err = self._process_ffmpeg(temp_raw, standard_path)
                if not ff_ok:
                    if temp_raw.exists():
                        temp_raw.unlink()
                    return False, ff_err, "", 0, 0

                tags_ok, q_txt, rate, bits = self._apply_tags(
                    standard_path, track_obj, album, cover_path,
                    synced_lyrics=synced_lyrics,
                    plain_lyrics=plain_lyrics
                )
                if not tags_ok:
                    q_txt = "Tags Fallaron"

                if temp_raw.exists():
                    try:
                        temp_raw.unlink()
                    except OSError:
                        pass

                return True, str(standard_path), q_txt, rate, bits

        except Exception as e:
            if 'temp_raw' in locals() and temp_raw.exists():
                temp_raw.unlink()
            if 'temp_mqa' in locals() and temp_mqa.exists():
                temp_mqa.unlink()
            if 'temp_atmos' in locals() and temp_atmos.exists():
                temp_atmos.unlink()
            return False, f"Fallo Crítico: {str(e)}", "", 0, 0

    # ==========================================
    # ZIP (sin cambios)
    # ==========================================
    def pack_folder_to_zip(self, folder_path: Union[str, Path]) -> Optional[io.BytesIO]:
        folder = Path(folder_path)
        # Incluir FLAC normales y MQA
        flac_files = sorted(folder.glob("*.flac"))
        if not flac_files:
            return None
        try:
            buffer = io.BytesIO()
            with zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED) as zf:
                for f in flac_files:
                    zf.write(f, arcname=f.name)
            buffer.seek(0)
            return buffer
        except Exception as e:
            self.log(f"⚠️ Error creando ZIP: {str(e)}")
            return None

    # ==========================================
    # LIMPIEZA
    # ==========================================
    def cleanup_folder(self, folder_absolute: Union[str, Path]):
        try:
            folder_path = Path(folder_absolute)
            if not folder_path.exists():
                return
            for temp_file in folder_path.glob("temp_*.flac"):
                try:
                    temp_file.unlink()
                except Exception:
                    pass
            for temp_file in folder_path.glob("temp_mqa_*.flac"):
                try:
                    temp_file.unlink()
                except Exception:
                    pass
            for temp_file in folder_path.glob("temp_atmos_*.mp4"):
                try:
                    temp_file.unlink()
                except Exception:
                    pass
        except OSError:
            pass

    def cleanup_on_cancel(self, folder_absolute: Union[str, Path]):
        self.cleanup_folder(folder_absolute)