import streamlit as st
import time
import base64
import json
from pathlib import Path
import threading
import concurrent.futures
from streamlit.runtime.scriptrunner import add_script_run_ctx, get_script_run_ctx

from tidalapi.session import Session as TidalSession
from downloader import TidalDownloader
import ui_components as ui

st.set_page_config(page_title="Music 4 All", page_icon="⚡", layout="wide")
ui.load_css_and_animations()

# ==========================================
# SPRINT 1 — Eliminación de settings.json y selección de carpeta
# Ahora el engine maneja su propio directorio temporal
# ==========================================

st.markdown("""
<style>
.error-box { border: 2px solid #FF0000; border-radius: 10px; padding: 15px 20px; background: rgba(255,0,0,0.1); color: #FFF; font-weight: bold; box-shadow: 0 0 10px rgba(255,0,0,0.5); margin-bottom: 20px; }
.error-icon { color: #FF0000; font-size: 1.5rem; margin-right: 10px; vertical-align: middle; }
.login-box { border: 2px solid #D500F9; border-radius: 15px; padding: 30px; background: rgba(0,0,0,0.8); text-align: center; box-shadow: 0 0 20px rgba(213, 0, 249, 0.3); margin-top: 20px; margin-bottom: 30px; }
.step-box-cyan {
    border: 2px solid #fff;
    border-radius: 12px; padding: 25px;
    background: rgba(0, 255, 255, 0.05);
    text-align: center;
    box-shadow: 0 0 10px #fff, 0 0 20px #00FFFF, inset 0 0 8px #00FFFF;
    animation: box-flicker 4s infinite;
    margin-bottom: 20px;
}
.step-box-purple {
    border: 2px solid #fff;
    border-radius: 12px; padding: 25px;
    background: rgba(213, 0, 249, 0.05);
    text-align: center;
    box-shadow: 0 0 10px #fff, 0 0 20px #D500F9, inset 0 0 8px #D500F9;
    animation: box-flicker 4s infinite 0.5s;
    margin-bottom: 20px;
}
.auth-code { font-family: 'Consolas', monospace; font-size: 3.5rem; font-weight: 900; color: #fff; text-shadow: 0 0 10px #D500F9, 0 0 20px #D500F9, 0 0 40px #D500F9; letter-spacing: 8px; margin: 15px 0; animation: text-flicker 3s infinite alternate; }
.auth-link { display: inline-block; margin-top: 10px; padding: 12px 25px; background: rgba(0, 255, 255, 0.1); border: 2px solid #00FFFF; color: #00FFFF !important; font-size: 1.2rem; font-weight: bold; text-decoration: none; border-radius: 8px; transition: all 0.3s; }
.auth-link:hover { background: rgba(0, 255, 255, 0.25); box-shadow: 0 0 20px #00FFFF; transform: translateY(-2px); }
</style>
""", unsafe_allow_html=True)

# ==========================================
# SESSION STATE
# ==========================================
if "tidal_tokens" not in st.session_state:
    st.session_state.tidal_tokens = None
if "history" not in st.session_state:
    st.session_state.history = []
if "stop_download" not in st.session_state:
    st.session_state.stop_download = False
if "global_cancel" not in st.session_state:
    st.session_state.global_cancel = threading.Event()
if "meta_cache" not in st.session_state:
    st.session_state.meta_cache = None
if "selection_map" not in st.session_state:
    st.session_state.selection_map = {}
if "login_flow" not in st.session_state:
    st.session_state.login_flow = None
if "zip_ready" not in st.session_state:
    st.session_state.zip_ready = None

engine = TidalDownloader(session_data=st.session_state.tidal_tokens)

def clear_text():
    st.session_state.url_input = ""
    st.session_state.meta_cache = None
    st.session_state.selection_map = {}
    st.session_state.zip_ready = None

def full_reset():
    st.session_state.stop_download = True
    st.session_state.global_cancel.set()
    clear_text()

# ==========================================
# GARBAGE COLLECTOR (usa carpeta temporal del engine)
# ==========================================
def garbage_collector():
    # Limpia temporales sobrantes en el directorio de descargas del engine
    engine.cleanup_folder(engine.download_folder)

garbage_collector()




def show_error_modal(message):
    st.markdown(
        f"""<div class="error-box"><span class="error-icon">❌</span> {message}</div>""",
        unsafe_allow_html=True
    )


def _fallback_cover_svg():
    return (
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' "
        "width='110' height='110'%3E%3Crect fill='%23222' width='110' "
        "height='110'/%3E%3Ctext x='55' y='68' font-size='48' "
        "text-anchor='middle' fill='%23555'%3E%E2%99%AA%3C/text%3E%3C/svg%3E"
    )

# ==========================================
# FLUJO DE LOGIN (BYOA)
# ==========================================
if not engine.check_auth():
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown("""<div style="text-align: center; margin-bottom: 20px;">
            <div class="neon-box"><h1 class="neon-text">Music 4 All</h1></div>
        </div>""", unsafe_allow_html=True)

        if st.session_state.login_flow is None:
            st.markdown("""
            <div class="login-box">
                <h2 style='color:#D500F9; margin-top:0;'>🔒 Conectar Cuenta</h2>
                <p style='color:#ccc; font-size:1.1rem; line-height:1.6;'>
                    Para descargar música en alta fidelidad, necesitas vincular tu cuenta de Tidal.<br>
                    <span style='color:#00FFFF;'>Tus credenciales son privadas y se borrarán al cerrar la página.</span>
                </p>
            </div>
            """, unsafe_allow_html=True)
            st.write("")
            if st.button("VINCULAR CUENTA DE TIDAL", type="primary", use_container_width=True):
                temp_session = TidalSession()
                login_obj, future = temp_session.login_oauth()
                device_code = getattr(login_obj, 'user_code', 'Desconocido')
                raw_url = getattr(login_obj, 'verification_uri_complete', "")
                if not raw_url:
                    raw_url = getattr(login_obj, 'verification_uri', f"link.tidal.com/{device_code}")
                if not raw_url.startswith("http"):
                    raw_url = "https://" + raw_url

                st.session_state.login_flow = {
                    "session": temp_session, "url": raw_url,
                    "code": device_code, "future": future
                }
                st.rerun()
        else:
            flow = st.session_state.login_flow
            st.markdown(f"""
            <div class="step-box-cyan">
                <h3 style='margin-top:0; color:#00FFFF; font-weight:900;'>PASO 1: AUTORIZAR DISPOSITIVO</h3>
                <p style='font-size:1.1rem; color:#ccc;'>Haz clic en el siguiente botón para abrir el portal seguro de Tidal.</p>
                <a href="{flow['url']}" target="_blank" class="auth-link">🔗 ABRIR PORTAL DE TIDAL</a>
            </div>
            <div class="step-box-purple">
                <h3 style='margin-top:0; color:#D500F9; font-weight:900;'>PASO 2: CONFIRMAR CÓDIGO</h3>
                <p style='font-size:1.1rem; color:#ccc;'>Verifica que el código mostrado coincida con este:</p>
                <div class="auth-code">{flow['code']}</div>
            </div>
            """, unsafe_allow_html=True)
            st.write("")
            if st.button("🚀 INGRESAR A LA APLICACIÓN", type="primary", use_container_width=True):
                future = flow["future"]
                temp_session = flow["session"]
                with st.spinner("Verificando conexión con Tidal..."):
                    try:
                        future.result(timeout=4)
                        if temp_session.check_login():
                            st.session_state.tidal_tokens = {
                                'token_type': temp_session.token_type,
                                'access_token': temp_session.access_token,
                                'refresh_token': temp_session.refresh_token,
                                'expiry_time': temp_session.expiry_time.isoformat()
                            }
                            st.session_state.login_flow = None
                            st.toast("✅ ¡Acceso Autorizado!")
                            time.sleep(1)
                            st.rerun()
                    except concurrent.futures.TimeoutError:
                        show_error_modal("Aún no has autorizado la aplicación en la ventana de Tidal.")
                    except Exception as e:
                        show_error_modal(f"Error de autenticación: {str(e)}")
            if st.button("CANCELAR", type="secondary", use_container_width=True):
                st.session_state.login_flow = None
                st.rerun()

# ==========================================
# APLICACIÓN PRINCIPAL
# ==========================================
else:
    st.session_state.tidal_tokens = engine.get_session_data()

    with st.sidebar:
        st.markdown("### 🎛️ ESTADO")
        st.success("🟢 ONLINE (Tu Cuenta)")
        if st.button("CERRAR SESIÓN", type="secondary"):
            st.session_state.tidal_tokens = None
            st.rerun()

        # SPRINT 1: Eliminado el selector de carpeta de descargas
        # Se muestra la carpeta temporal informativa (solo para depuración local)
        st.divider()
        st.markdown("### 📂 UBICACIÓN TEMPORAL")
        st.code(str(engine.download_folder), language=None)

        st.divider()
        st.markdown("### 🕒 RECIENTES")
        for item in st.session_state.history:
            st.markdown(
                f"""<div style="opacity:0.7; font-size:12px; margin-bottom:5px;">
                    <b>{item["title"]}</b> ({item["time"]})
                </div>""",
                unsafe_allow_html=True
            )

    col_h1, col_h2, col_h3 = st.columns([1, 2, 1])
    with col_h2:
        st.markdown("""<div style="text-align: center; margin-bottom: 20px;">
            <div class="neon-box"><h1 class="neon-text">Music 4 All</h1></div>
        </div>""", unsafe_allow_html=True)

    col_spacer_L, col_main, col_spacer_R = st.columns([1, 4, 1])

    with col_main:
        link = st.text_input(
            "Link", key="url_input",
            placeholder="Pegue enlace de Tidal aquí...",
            label_visibility="collapsed"
        )
        st.write("")

        start_analysis = False
        start_download = False

        if not st.session_state.meta_cache:
            if st.button("BUSCAR / ANALIZAR", type="primary", use_container_width=True):
                start_analysis = True

        if start_analysis and link:
            with st.spinner("Conectando con Tidal..."):
                meta = engine.get_metadata(link)
                if "error" in meta:
                    show_error_modal(meta['error'])
                else:
                    st.session_state.meta_cache = meta
                    st.session_state.zip_ready = None
                    if meta["type"] != "track":
                        st.session_state.selection_map = {
                            f"t_{i}": True for i in range(len(meta["items"]))
                        }
                    st.rerun()

        if st.session_state.meta_cache:
            meta = st.session_state.meta_cache
            items = meta["items"]

            header_img = meta.get("hires_url") or meta.get("thumb_url") or _fallback_cover_svg()
            badge_main = meta.get("quality_badge", "HIFI")
            badge_sub = meta.get("quality_desc", "Lossless")

            if badge_main == "MAX":
                badge_color = "#F9A825"
            elif badge_main == "PLAYLIST":
                badge_color = "#D500F9"
            else:
                badge_color = "#00FFFF"

            t_count = meta.get("tracks_count", 1)
            year_info = meta.get("year", "")

            if meta.get("audio_format") not in (None, "FLAC"):
                formato_extra = f"<span style='color:#FFA500; font-size:0.8rem;'>({meta['audio_format']})</span>"
            else:
                formato_extra = ""

            st.markdown(f"""
            <div class="album-header" style="border-color: {badge_color};">
                <div class="header-badge-container">
                    <div class="badge-main" style="background-color: {badge_color};">{badge_main}</div>
                    <div class="badge-sub">{badge_sub} {formato_extra}</div>
                </div>
                <img src="{header_img}" style="width:110px; height:110px; border-radius:6px; box-shadow:0 4px 10px #000;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22110%22 height=%22110%22%3E%3Crect fill=%22%23222%22 width=%22110%22 height=%22110%22/%3E%3Ctext x=%2255%22 y=%2262%22 font-size=%2240%22 text-anchor=%22middle%22 fill=%22%23555%22%3E♪%3C/text%3E%3C/svg%3E'">
                <div style="display:flex; flex-direction:column; justify-content:center;">
                    <span style="color:{badge_color}; font-size:0.8rem; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">{meta["type"]}</span>
                    <h2 style="margin:5px 0; color:white; font-size:1.6rem; line-height:1.2;">{meta["title"]}</h2>
                    <h3 style="margin:0; color:#ccc; font-size:1rem;">{meta["artist"]}</h3>
                    <span style="color:#666; font-size:12px; margin-top:5px;">{year_info} • {t_count} Tracks</span>
                </div>
            </div>
            """, unsafe_allow_html=True)

            selected_indices = []

            if meta["type"] == "track":
                track = items[0]
                st.markdown(f"""
                <div class="track-row" style="background:#151515; border-left: 3px solid {badge_color};">
                    <div class="track-left">
                        <img src="{header_img}" class="track-thumb" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Crect fill=%22%23222%22 width=%2240%22 height=%2240%22/%3E%3Ctext x=%2220%22 y=%2226%22 font-size=%2218%22 text-anchor=%22middle%22 fill=%22%23555%22%3E♪%3C/text%3E%3C/svg%3E'">
                        <div class="track-info">
                            <div class="t-title">{track.name}</div>
                            <div class="t-artist">{track.artist.name}</div>
                        </div>
                    </div>
                </div>
                """, unsafe_allow_html=True)
                p_bar = st.empty()
                selected_indices.append((0, track, p_bar))

                st.write("")
                col_d, col_c = st.columns([2, 1])
                with col_d:
                    if st.button("DESCARGAR CANCIÓN", type="primary", use_container_width=True):
                        start_download = True
                with col_c:
                    st.button("LIMPIAR", type="secondary", on_click=full_reset, use_container_width=True)

            else:
                c_sel_all, c_sel_txt = st.columns([1, 15])
                with c_sel_txt:
                    st.caption("Seleccione las canciones que desea descargar:")
                st.markdown("""<div style="display:flex; justify-content:space-between; padding:0 10px; margin-bottom:10px; font-size:0.8rem; color:#666;">
                    <span>TRACKS</span><span>ESTADO</span>
                </div>""", unsafe_allow_html=True)

                for i, track in enumerate(items):
                    chk_key = f"t_{i}"
                    c_chk, c_info, c_bar = st.columns([1, 8, 3])

                    with c_chk:
                        is_selected = st.checkbox(
                            f"Sel {i}", key=chk_key,
                            value=st.session_state.selection_map.get(chk_key, True),
                            label_visibility="collapsed"
                        )
                        st.session_state.selection_map[chk_key] = is_selected

                    with c_info:
                        t_name = track.name
                        t_artist = track.artist.name

                        t_thumb = None
                        if meta["type"] == "playlist":
                            try:
                                if track.album.cover:
                                    t_thumb = f"https://resources.tidal.com/images/{track.album.cover.replace('-', '/')}/80x80.jpg"
                            except Exception:
                                pass
                        else:
                            t_thumb = meta.get("thumb_url")

                        fallback_svg = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Crect fill=%22%23222%22 width=%2240%22 height=%2240%22/%3E%3Ctext x=%2220%22 y=%2226%22 font-size=%2218%22 text-anchor=%22middle%22 fill=%22%23555%22%3E%E2%99%AA%3C/text%3E%3C/svg%3E"
                        img_src = t_thumb or fallback_svg

                        st.markdown(f"""
                        <div class="track-row">
                            <div class="track-left">
                                <img src="{img_src}" class="track-thumb" onerror="this.src='{fallback_svg}'">
                                <div class="track-info">
                                    <div class="t-title">{t_name}</div>
                                    <div class="t-artist">{t_artist}</div>
                                </div>
                            </div>
                        </div>
                        """, unsafe_allow_html=True)

                    with c_bar:
                        p_bar = st.empty()
                        if is_selected:
                            p_bar.markdown(
                                ui.make_progress_bar(0, "Pendiente", badge_color),
                                unsafe_allow_html=True
                            )
                            selected_indices.append((i, track, p_bar))

                st.write("")
                col_dl, col_rst = st.columns([2, 1])
                with col_dl:
                    if st.button("DESCARGAR SELECCIONADOS", type="primary", use_container_width=True):
                        start_download = True
                with col_rst:
                    st.button(
                        "LIMPIAR BÚSQUEDA", type="secondary",
                        on_click=full_reset, use_container_width=True
                    )

        # ==========================================
        # MOTOR DE DESCARGA PARALELA (SPRINT 1: ahora usa folder_name)
        # ==========================================
        if start_download and st.session_state.meta_cache:
            st.session_state.stop_download = False
            st.session_state.global_cancel.clear()
            st.session_state.zip_ready = None
            garbage_collector()

            meta = st.session_state.meta_cache
            folder_name = meta["folder"]  # subcarpeta dentro del temp dir

            if meta["type"] == "track":
                folder_name = ""  # para pista individual, va directo en el temp dir raíz

            tracks_to_dl = selected_indices

            if not tracks_to_dl:
                st.warning("⚠️ No has seleccionado ninguna canción.")
            else:
                st.toast(f"Descargando {len(tracks_to_dl)} elemento(s) en paralelo...", icon="⬇️")
                ctx = get_script_run_ctx()

                def worker(track_data):
                    original_i, track, p_bar_widget = track_data

                    if ctx:
                        add_script_run_ctx(threading.current_thread(), ctx)

                    if st.session_state.global_cancel.is_set():
                        p_bar_widget.markdown(
                            "<div style='text-align:right; color:#FF0000; font-weight:bold; font-size:0.8rem; padding:10px;'>❌ Cancelado</div>",
                            unsafe_allow_html=True
                        )
                        return

                    t_color = "#00FFFF"
                    try:
                        modes = [str(m).upper() for m in getattr(track, "audio_modes", [])]
                        q = str(getattr(track, "audio_quality", "")).upper()
                        if "MASTER" in modes or "HI_RES" in modes or q == "HI_RES":
                            t_color = "#F9A825"
                    except Exception:
                        pass

                    def update_bar(percentage):
                        if not st.session_state.global_cancel.is_set():
                            p_bar_widget.markdown(
                                ui.make_progress_bar(percentage, "Descargando...", t_color),
                                unsafe_allow_html=True
                            )

                    # SPRINT 1: Llamada sin ruta absoluta, solo el folder_name
                    ok, path, q_txt, s_rate, s_bits = engine.download_single_track(
                        track, folder_name=folder_name,
                        progress_callback=update_bar,
                        cancel_event=st.session_state.global_cancel
                    )

                    if ok:
                        if q_txt == "EXISTE":
                            p_bar_widget.markdown(
                                "<div style='text-align:right; color:#00FF00; font-weight:bold; font-size:0.9rem; padding:10px;'>✔ YA EXISTE</div>",
                                unsafe_allow_html=True
                            )
                        else:
                            final_color = "#F9A825" if (s_bits > 16 or s_rate > 44100) else "#00FFFF"
                            p_bar_widget.markdown(
                                f"<div style='text-align:right; color:{final_color}; font-weight:bold; font-size:0.9rem; padding:10px;'>✔ {q_txt}</div>",
                                unsafe_allow_html=True
                            )
                        # SPRINT 1: Si es un track individual, mostramos botón de descarga directamente
                        if meta["type"] == "track":
                            ui.trigger_auto_download(path, auto_trigger=False)
                    else:
                        if st.session_state.global_cancel.is_set():
                            p_bar_widget.markdown(
                                "<div style='text-align:right; color:#FF0000; font-weight:bold; font-size:0.8rem; padding:10px;'>❌ Cancelado</div>",
                                unsafe_allow_html=True
                            )
                        else:
                            p_bar_widget.markdown(
                                f"<div style='text-align:right; color:#FF0000; font-weight:bold; font-size:0.8rem; padding:10px;'>❌ {q_txt}</div>",
                                unsafe_allow_html=True
                            )

                with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                    futures = [executor.submit(worker, item) for item in tracks_to_dl]
                    concurrent.futures.wait(futures)

                if st.session_state.global_cancel.is_set():
                    show_error_modal("Descarga Cancelada por el Usuario.")
                    full_folder_path = engine.download_folder / folder_name if folder_name else engine.download_folder
                    engine.cleanup_on_cancel(full_folder_path)
                else:
                    st.toast("✅ ¡Todas las descargas han finalizado!")
                    st.session_state.history.insert(0, {
                        "title": meta["title"],
                        "time": time.strftime("%H:%M")
                    })

                    # SPRINT 1: ZIP de álbum/playlist se descarga directamente
                    if meta["type"] in ("album", "playlist"):
                        full_folder_path = engine.download_folder / folder_name
                        with st.spinner("Preparando ZIP para descarga..."):
                            zip_buffer = engine.pack_folder_to_zip(full_folder_path)
                        if zip_buffer:
                            safe_zip_name = engine._sanitize_filename(meta["title"]) + ".zip"
                            st.download_button(
                                label=f"⬇️  DESCARGAR ZIP — {safe_zip_name}",
                                data=zip_buffer,
                                file_name=safe_zip_name,
                                mime="application/zip",
                                use_container_width=True
                            )
                        else:
                            st.warning("⚠️ No se pudo generar el ZIP (carpeta vacía o error).")


def _fallback_cover_svg():
    return (
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' "
        "width='110' height='110'%3E%3Crect fill='%23222' width='110' "
        "height='110'/%3E%3Ctext x='55' y='68' font-size='48' "
        "text-anchor='middle' fill='%23555'%3E%E2%99%AA%3C/text%3E%3C/svg%3E"
    )