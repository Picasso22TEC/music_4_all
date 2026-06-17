"""
Unit tests for app.core.job_controls.

Covers:
    JobControl       — cancel_event and pause_event defaults
    JobControlRegistry — register, get, unregister, len, idempotent unregister
"""

from app.core.job_controls import JobControl, JobControlRegistry

# ─── JobControl ───────────────────────────────────────────────────────────────


class TestJobControl:
    def test_cancel_event_unset_by_default(self) -> None:
        ctrl = JobControl()
        assert not ctrl.cancel_event.is_set()

    def test_pause_event_unset_by_default(self) -> None:
        ctrl = JobControl()
        assert not ctrl.pause_event.is_set()

    def test_cancel_event_can_be_set(self) -> None:
        ctrl = JobControl()
        ctrl.cancel_event.set()
        assert ctrl.cancel_event.is_set()

    def test_pause_event_can_be_set_and_cleared(self) -> None:
        ctrl = JobControl()
        ctrl.pause_event.set()
        assert ctrl.pause_event.is_set()
        ctrl.pause_event.clear()
        assert not ctrl.pause_event.is_set()

    def test_cancel_and_pause_are_independent(self) -> None:
        ctrl = JobControl()
        ctrl.cancel_event.set()
        assert not ctrl.pause_event.is_set()

        ctrl2 = JobControl()
        ctrl2.pause_event.set()
        assert not ctrl2.cancel_event.is_set()


# ─── JobControlRegistry ───────────────────────────────────────────────────────


class TestJobControlRegistry:
    def test_register_returns_job_control(self) -> None:
        reg = JobControlRegistry()
        ctrl = reg.register("job-001")
        assert isinstance(ctrl, JobControl)

    def test_get_returns_registered_control(self) -> None:
        reg = JobControlRegistry()
        ctrl = reg.register("job-001")
        assert reg.get("job-001") is ctrl

    def test_get_unknown_job_returns_none(self) -> None:
        reg = JobControlRegistry()
        assert reg.get("nonexistent") is None

    def test_unregister_removes_control(self) -> None:
        reg = JobControlRegistry()
        reg.register("job-001")
        reg.unregister("job-001")
        assert reg.get("job-001") is None

    def test_unregister_unknown_job_is_idempotent(self) -> None:
        reg = JobControlRegistry()
        reg.unregister("nonexistent")  # must not raise

    def test_len_reflects_active_jobs(self) -> None:
        reg = JobControlRegistry()
        assert len(reg) == 0
        reg.register("job-001")
        assert len(reg) == 1
        reg.register("job-002")
        assert len(reg) == 2
        reg.unregister("job-001")
        assert len(reg) == 1

    def test_register_overwrites_existing_control(self) -> None:
        reg = JobControlRegistry()
        ctrl1 = reg.register("job-001")
        ctrl2 = reg.register("job-001")
        # Second register creates a fresh control; old reference is stale
        assert ctrl1 is not ctrl2
        assert reg.get("job-001") is ctrl2

    def test_multiple_jobs_are_independent(self) -> None:
        reg = JobControlRegistry()
        ctrl_a = reg.register("job-A")
        ctrl_b = reg.register("job-B")
        ctrl_a.cancel_event.set()
        assert not ctrl_b.cancel_event.is_set()
