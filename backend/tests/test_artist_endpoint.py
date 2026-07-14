"""Tests para GET /artists/{artist_id} — detalle de artista (search-v2)."""

from __future__ import annotations

from types import SimpleNamespace

from app.main import app


def _mock_artist() -> SimpleNamespace:
    artist_ref = SimpleNamespace(id=100, name="Test Artist")
    album_ref = SimpleNamespace(id=200, name="Test Album", cover="album-cover-uuid")
    track = SimpleNamespace(
        id=1,
        name="Top Track",
        track_num=1,
        duration=180,
        audio_quality="LOSSLESS",
        audio_modes=[],
        isrc="USX000000001",
        artist=artist_ref,
        album=album_ref,
    )
    def _release(name: str, rtype: str) -> SimpleNamespace:
        return SimpleNamespace(
            id=200,
            name=name,
            artist=artist_ref,
            cover="cover-uuid",
            release_date="2020-01-01",
            num_tracks=10,
            duration=2400,
            audio_quality="LOSSLESS",
            # Hi-Res disponible via mediaMetadata → el badge debe mostrar HIRES.
            media_metadata_tags=["LOSSLESS", "HIRES_LOSSLESS"],
            audio_modes=[],
            upc=None,
            label=None,
            copyright=None,
            type=rtype,
        )

    similar_ref = SimpleNamespace(id=300, name="Similar Artist", picture="sim-uuid")
    return SimpleNamespace(
        id=100,
        name="Test Artist",
        picture="pic-uuid",
        get_top_tracks=lambda limit=15: [track],
        get_albums=lambda: [_release("Test Album", "ALBUM")],
        get_ep_singles=lambda limit=20: [_release("Test Single", "SINGLE")],
        get_other=lambda limit=20: [_release("Test Compilation", "COMPILATION")],
        get_similar=lambda: [similar_ref],
    )


def test_artist_detail_returns_artist_top_tracks_and_albums(api_client_with_state):
    client = api_client_with_state
    app.state.engine.session.artist.return_value = _mock_artist()

    resp = client.get("/artists/100")

    assert resp.status_code == 200
    body = resp.json()
    assert body["artist"]["id"] == "100"
    assert body["artist"]["name"] == "Test Artist"
    assert body["artist"]["picture"].startswith("https://resources.tidal.com/images/")
    assert len(body["top_tracks"]) == 1
    assert body["top_tracks"][0]["title"] == "Top Track"
    # La portada del álbum de la pista viaja en el DTO para que el reproductor
    # (PlayerBar / Now Playing) la muestre al reproducir desde la vista de artista.
    assert body["top_tracks"][0]["album"]["cover"] == "album-cover-uuid"
    assert len(body["albums"]) == 1
    assert body["albums"][0]["title"] == "Test Album"
    assert body["albums"][0]["type"] == "ALBUM"
    # La calidad se deriva de mediaMetadata (Hi-Res disponible) para el badge.
    assert body["albums"][0]["audio_quality"] == "HIRES"
    # EPs & singles separados de los álbumes completos.
    assert len(body["ep_singles"]) == 1
    assert body["ep_singles"][0]["type"] == "SINGLE"
    # Compilaciones / apariciones como invitado.
    assert len(body["other"]) == 1
    assert body["other"][0]["type"] == "COMPILATION"
    # Artistas similares con foto.
    assert len(body["similar"]) == 1
    assert body["similar"][0]["name"] == "Similar Artist"
    assert body["similar"][0]["picture"].startswith("https://resources.tidal.com/images/")


def test_artist_detail_survives_partial_tidal_failures(api_client_with_state):
    # Si get_albums falla, la vista sigue siendo útil con top tracks.
    client = api_client_with_state

    def _boom() -> list:
        raise RuntimeError("tidal down")

    artist = _mock_artist()
    artist.get_albums = _boom
    app.state.engine.session.artist.return_value = artist

    resp = client.get("/artists/100")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["top_tracks"]) == 1
    assert body["albums"] == []


def test_artist_detail_non_numeric_id_returns_400(api_client_with_state):
    client = api_client_with_state
    resp = client.get("/artists/not-a-number")
    assert resp.status_code == 400
