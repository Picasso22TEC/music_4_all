import json
from pathlib import Path

from app.config import settings


class AuthRepository:
    """Persistencia de sesión en session.json. Redis en Fase 2."""

    def _path(self) -> Path:
        return Path(settings.session_file)

    def save_session(self, session_data: dict) -> None:
        try:
            self._path().write_text(json.dumps(session_data, indent=2))
        except Exception:
            pass

    def load_session(self) -> dict | None:
        try:
            if self._path().exists():
                return json.loads(self._path().read_text())
        except Exception:
            pass
        return None

    def delete_session(self) -> None:
        try:
            self._path().unlink(missing_ok=True)
        except Exception:
            pass
