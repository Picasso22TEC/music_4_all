"""Anti-IDOR a nivel HTTP: los endpoints por job_id verifican el dueño.

Usa `api_client_with_state`, que sobrescribe `get_current_user` para simular la
sesión "test-user". Controlamos `app.state.redis.get` para devolver estados de job
con distinto dueño y comprobar el 403.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock

from app.main import app


def _job(owner: str | None, *, status: str = "completed", file_path: str | None = None) -> str:
    return json.dumps(
        {
            "job_id": "job-x",
            "title": "Album",
            "status": status,
            "progress": 100.0,
            "error": None,
            "file_path": file_path,
            "user_id": owner,
        }
    )


def test_status_of_other_users_job_is_403(api_client_with_state):
    client = api_client_with_state
    app.state.redis.get = AsyncMock(return_value=_job("other-user", status="downloading"))
    resp = client.get("/download/status/job-x")
    assert resp.status_code == 403


def test_status_of_own_job_ok(api_client_with_state):
    client = api_client_with_state
    app.state.redis.get = AsyncMock(return_value=_job("test-user", status="downloading"))
    resp = client.get("/download/status/job-x")
    assert resp.status_code == 200
    assert resp.json()["job_id"] == "job-x"


def test_file_of_other_users_job_is_403(api_client_with_state):
    client = api_client_with_state
    app.state.redis.get = AsyncMock(return_value=_job("other-user", file_path="/x.flac"))
    resp = client.get("/download/file/job-x")
    assert resp.status_code == 403


def test_status_missing_job_is_404(api_client_with_state):
    client = api_client_with_state
    app.state.redis.get = AsyncMock(return_value=None)
    resp = client.get("/download/status/ghost")
    assert resp.status_code == 404
