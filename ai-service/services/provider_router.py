import os
import time
from copy import deepcopy
from typing import Awaitable, Callable, Dict, List, Optional, Tuple


PROVIDER_COST_RANK = {
    "gemini": 1,
    "groq": 2,
    "zhipu": 3,
}

BREAKER_FAILURE_THRESHOLD = int(os.getenv("AI_PROVIDER_BREAKER_FAILURE_THRESHOLD", "2"))
BREAKER_COOLDOWN_SECONDS = int(os.getenv("AI_PROVIDER_BREAKER_COOLDOWN_SECONDS", "30"))


def _make_provider_stats() -> Dict[str, object]:
    return {
        "success_count": 0,
        "failure_count": 0,
        "consecutive_failures": 0,
        "last_latency_ms": None,
        "last_error": None,
        "last_status": "idle",
        "last_used_at": None,
        "breaker_state": "closed",
        "breaker_opened_at": None,
    }


_PROVIDER_HEALTH: Dict[str, Dict[str, object]] = {
    name: _make_provider_stats()
    for name in PROVIDER_COST_RANK
}


def reset_provider_health_metrics() -> None:
    for name in list(_PROVIDER_HEALTH.keys()):
        _PROVIDER_HEALTH[name] = _make_provider_stats()


def _refresh_breaker_state(provider_name: str) -> Dict[str, object]:
    stats = _PROVIDER_HEALTH.setdefault(provider_name, _make_provider_stats())
    if stats["breaker_state"] == "open" and stats["breaker_opened_at"]:
        elapsed = time.time() - float(stats["breaker_opened_at"])
        if elapsed >= BREAKER_COOLDOWN_SECONDS:
            stats["breaker_state"] = "half_open"
            stats["breaker_opened_at"] = None
    return stats


def get_provider_health_snapshot() -> Dict[str, Dict[str, object]]:
    return {
        provider_name: deepcopy(_refresh_breaker_state(provider_name))
        for provider_name in PROVIDER_COST_RANK
    }


def record_provider_result(provider_name: str, success: bool, latency_ms: float, error: Optional[str]) -> None:
    stats = _refresh_breaker_state(provider_name)
    stats["last_latency_ms"] = round(latency_ms, 2)
    stats["last_error"] = error
    stats["last_status"] = "success" if success else "failure"
    stats["last_used_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if success:
        stats["success_count"] += 1
        stats["consecutive_failures"] = 0
        stats["breaker_state"] = "closed"
        stats["breaker_opened_at"] = None
        return

    stats["failure_count"] += 1
    stats["consecutive_failures"] += 1
    if stats["consecutive_failures"] >= BREAKER_FAILURE_THRESHOLD:
        stats["breaker_state"] = "open"
        stats["breaker_opened_at"] = time.time()


def _provider_rank(provider_name: str) -> Tuple[int, int, float, int]:
    stats = _refresh_breaker_state(provider_name)
    breaker_rank = {
        "closed": 0,
        "half_open": 1,
        "open": 2,
    }.get(stats["breaker_state"], 3)

    success_count = int(stats["success_count"])
    failure_count = int(stats["failure_count"])
    total = success_count + failure_count
    failure_rate_rank = int((failure_count / total) * 1000) if total > 0 else 0
    latency_rank = float(stats["last_latency_ms"] or 999999.0)
    cost_rank = PROVIDER_COST_RANK.get(provider_name, 999)

    return breaker_rank, failure_rate_rank, latency_rank, cost_rank


def order_providers(provider_chain: List[Tuple[str, Callable]]) -> List[Tuple[str, Callable]]:
    return sorted(provider_chain, key=lambda item: _provider_rank(item[0]))


async def call_with_provider_router(
    provider_chain: List[Tuple[str, Callable]],
    caller: Callable[[str, Callable], Awaitable[Optional[str]]],
) -> Tuple[Optional[str], Optional[str], List[str]]:
    errors: List[str] = []

    for provider_name, provider_func in order_providers(provider_chain):
        stats = _refresh_breaker_state(provider_name)
        if stats["breaker_state"] == "open":
            errors.append(f"{provider_name} skipped because circuit breaker is open")
            continue

        started = time.perf_counter()
        content = None
        error_message = None

        try:
            content = await caller(provider_name, provider_func)
            if not content:
                error_message = f"{provider_name} returned no content"
        except Exception as exc:
            error_message = str(exc)

        elapsed_ms = (time.perf_counter() - started) * 1000
        record_provider_result(provider_name, bool(content), elapsed_ms, error_message)

        if content:
            return provider_name, content, errors

        if error_message:
            errors.append(error_message)

    return None, None, errors
