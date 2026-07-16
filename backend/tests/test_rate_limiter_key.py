"""La clave del rate limit va en cascada: usuario > sesión > IP."""

from __future__ import annotations

from types import SimpleNamespace

from app.core.rate_limiter import user_or_ip_key
from app.dependencies import CurrentUser


def _request(user=None, cookies=None, host="203.0.113.7"):
    state = SimpleNamespace()
    if user is not None:
        state.current_user = user
    return SimpleNamespace(
        state=state,
        cookies=cookies or {},
        client=SimpleNamespace(host=host),
    )


def test_authenticated_user_is_keyed_by_user_id():
    # Mismo usuario desde otra IP/dispositivo comparte cubo: el límite es suyo.
    user = CurrentUser(tidal_user_id="user-42", sid="sid-abc")
    assert user_or_ip_key(_request(user=user, cookies={"m4a_sid": "sid-abc"})) == "user:user-42"


def test_falls_back_to_session_id_when_user_not_resolved():
    # Ruta sin dependencia de auth (o límite por defecto del middleware, que corre
    # antes que las dependencias): al menos no se mezcla con otros tras el mismo NAT.
    assert user_or_ip_key(_request(cookies={"m4a_sid": "sid-abc"})) == "sid:sid-abc"


def test_falls_back_to_ip_when_anonymous():
    assert user_or_ip_key(_request()) == "ip:203.0.113.7"


def test_different_users_get_different_keys():
    a = _request(user=CurrentUser(tidal_user_id="a", sid="s1"))
    b = _request(user=CurrentUser(tidal_user_id="b", sid="s2"))
    assert user_or_ip_key(a) != user_or_ip_key(b)


def test_users_behind_the_same_ip_do_not_share_a_bucket():
    a = _request(user=CurrentUser(tidal_user_id="a", sid="s1"), host="198.51.100.1")
    b = _request(user=CurrentUser(tidal_user_id="b", sid="s2"), host="198.51.100.1")
    assert user_or_ip_key(a) != user_or_ip_key(b)
