import os
import sys
import time
from unittest.mock import AsyncMock

import pytest

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.provider_router import (
    call_with_provider_router,
    get_provider_health_snapshot,
    reset_provider_health_metrics,
)
import services.provider_router as provider_router


pytestmark = pytest.mark.asyncio


async def test_provider_router_opens_breaker_after_repeated_failures():
    reset_provider_health_metrics()
    provider_chain = [
        ("gemini", AsyncMock(return_value=None)),
    ]

    await call_with_provider_router(
        provider_chain,
        lambda _provider_name, provider_func: provider_func(),
    )
    await call_with_provider_router(
        provider_chain,
        lambda _provider_name, provider_func: provider_func(),
    )

    snapshot = get_provider_health_snapshot()
    assert snapshot["gemini"]["failure_count"] == 2
    assert snapshot["gemini"]["breaker_state"] == "open"


async def test_provider_router_skips_open_breaker_and_uses_next_provider():
    reset_provider_health_metrics()
    failing_provider = AsyncMock(return_value=None)
    healthy_provider = AsyncMock(return_value="Hello from Groq")

    provider_chain = [
        ("gemini", failing_provider),
        ("groq", healthy_provider),
    ]

    await call_with_provider_router(
        [("gemini", failing_provider)],
        lambda _provider_name, provider_func: provider_func(),
    )
    await call_with_provider_router(
        [("gemini", failing_provider)],
        lambda _provider_name, provider_func: provider_func(),
    )

    provider, content, errors = await call_with_provider_router(
        provider_chain,
        lambda _provider_name, provider_func: provider_func(),
    )

    assert provider == "groq"
    assert content == "Hello from Groq"
    assert failing_provider.await_count == 2
    assert healthy_provider.await_count == 1


async def test_provider_router_recovers_with_half_open_probe_after_cooldown():
    reset_provider_health_metrics()
    failing_provider = AsyncMock(return_value=None)
    recovered_provider = AsyncMock(return_value="Hello again")

    await call_with_provider_router(
        [("gemini", failing_provider)],
        lambda _provider_name, provider_func: provider_func(),
    )
    await call_with_provider_router(
        [("gemini", failing_provider)],
        lambda _provider_name, provider_func: provider_func(),
    )

    provider_router._PROVIDER_HEALTH["gemini"]["breaker_opened_at"] = time.time() - (
        provider_router.BREAKER_COOLDOWN_SECONDS + 1
    )

    provider, content, errors = await call_with_provider_router(
        [("gemini", recovered_provider)],
        lambda _provider_name, provider_func: provider_func(),
    )

    snapshot = get_provider_health_snapshot()
    assert provider == "gemini"
    assert content == "Hello again"
    assert errors == []
    assert recovered_provider.await_count == 1
    assert snapshot["gemini"]["breaker_state"] == "closed"
    assert snapshot["gemini"]["consecutive_failures"] == 0
