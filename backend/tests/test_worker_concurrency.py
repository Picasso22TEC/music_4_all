"""
Tests for RM-08 semaphore-based concurrency control.

Covers:
    _run_with_semaphore — releases slot on success and on exception
    Concurrency cap     — at most N jobs run simultaneously
    Config              — MAX_CONCURRENT_DOWNLOADS exposed in Settings
"""

from __future__ import annotations

import asyncio

import pytest

from app.config import settings
from app.core.worker import _run_with_semaphore

# ─── _run_with_semaphore ──────────────────────────────────────────────────────


class TestRunWithSemaphore:
    async def test_releases_slot_on_success(self) -> None:
        sem = asyncio.Semaphore(2)
        await sem.acquire()
        await sem.acquire()  # both slots consumed

        async def work() -> None:
            pass

        # Running _run_with_semaphore releases one slot
        await _run_with_semaphore(work(), sem)

        # Now one slot is free — acquire must not block (TimeoutError if it did)
        await asyncio.wait_for(sem.acquire(), timeout=0.1)
        sem.release()  # restore

    async def test_releases_slot_on_exception(self) -> None:
        sem = asyncio.Semaphore(1)
        await sem.acquire()  # consume the only slot

        async def failing() -> None:
            raise RuntimeError("simulated failure")

        with pytest.raises(RuntimeError, match="simulated failure"):
            await _run_with_semaphore(failing(), sem)

        # Slot must be released even though coro raised (TimeoutError if not)
        await asyncio.wait_for(sem.acquire(), timeout=0.1)
        sem.release()

    async def test_does_not_release_extra_slots(self) -> None:
        sem = asyncio.Semaphore(3)
        initial_value = sem._value  # 3

        async def work() -> None:
            pass

        await sem.acquire()
        await _run_with_semaphore(work(), sem)

        # Value must be back to initial, not above it
        assert sem._value == initial_value


# ─── Concurrency cap ──────────────────────────────────────────────────────────


class TestConcurrencyCap:
    async def test_at_most_n_tasks_run_concurrently(self) -> None:
        """With semaphore(2), peak concurrency must not exceed 2."""
        limit = 2
        sem = asyncio.Semaphore(limit)
        running: list[int] = []
        peak: list[int] = [0]
        barrier = asyncio.Event()

        async def work(n: int) -> None:
            running.append(n)
            peak[0] = max(peak[0], len(running))
            await barrier.wait()  # hold until all tasks are checked
            running.remove(n)

        # Spawn limit tasks, acquire their slots manually (as start_worker would)
        tasks = []
        for i in range(limit):
            await sem.acquire()
            tasks.append(asyncio.create_task(_run_with_semaphore(work(i), sem)))

        # Let all tasks progress to the barrier
        await asyncio.sleep(0)

        assert peak[0] == limit, f"Expected peak {limit}, got {peak[0]}"
        assert len(running) == limit

        barrier.set()
        await asyncio.gather(*tasks)
        assert len(running) == 0

    async def test_third_task_waits_until_slot_free(self) -> None:
        """A task that cannot acquire the semaphore must wait."""
        sem = asyncio.Semaphore(1)
        order: list[str] = []

        async def first() -> None:
            order.append("first_start")
            await asyncio.sleep(0)
            order.append("first_end")

        async def second() -> None:
            order.append("second_start")

        # Occupy the only slot
        await sem.acquire()
        t1 = asyncio.create_task(_run_with_semaphore(first(), sem))

        # Try to acquire for second — must wait because slot is taken by t1
        async def acquire_and_run() -> None:
            await sem.acquire()
            await _run_with_semaphore(second(), sem)

        t2 = asyncio.create_task(acquire_and_run())
        await asyncio.gather(t1, t2)

        # first must fully complete before second starts
        assert order.index("first_end") < order.index("second_start")


# ─── Config ───────────────────────────────────────────────────────────────────


class TestConfig:
    def test_max_concurrent_downloads_default_is_3(self) -> None:
        # Verify the default value matches the spec requirement
        assert settings.max_concurrent_downloads == 3

    def test_max_concurrent_downloads_is_positive(self) -> None:
        assert settings.max_concurrent_downloads >= 1
