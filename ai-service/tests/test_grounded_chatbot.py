import os
import sys
from unittest.mock import AsyncMock, patch
import pytest

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import GroundedChatRequest
from services.grounded_chatbot import grounded_chat_with_fallback
from services.provider_router import reset_provider_health_metrics

pytestmark = pytest.mark.asyncio


def make_request():
    return GroundedChatRequest(
        question="Tai sao he thong goi y thuoc nay?",
        specialty="ho_hap",
        matched_symptoms=["ho", "sot"],
        danger_alert=None,
        top_diseases=[
            {
                "code": "viem_phe_quan_cap",
                "display_name": "Viem phe quan cap",
                "icd10_code": "J20",
                "score": 0.84,
            }
        ],
        recommendations=[
            {
                "name": "Paracetamol 500mg",
                "generic_name": "Paracetamol",
                "confidence": 0.91,
                "reason": "Phu hop voi trieu chung da doi chieu",
                "dosage": "Theo huong dan bac si",
                "contraindications": "",
            }
        ],
        history=["Hen phe quan"],
        allergies=["Ibuprofen"],
        conversation=[{"role": "user", "content": "Toi dang lo ve do an toan"}],
    )


async def test_grounded_chat_returns_provider_answer_when_json_is_valid():
    reset_provider_health_metrics()
    request = make_request()
    provider_payload = '{"answer":"Paracetamol 500mg duoc giu lai vi phu hop voi trieu chung va co lien quan den Viem phe quan cap.","safety_note":"Thong tin chi de tham khao, neu kho tho nang len can di kham."}'

    with patch(
        "services.grounded_chatbot.chat_with_fallback",
        AsyncMock(return_value=(True, provider_payload, "gemini", None)),
    ):
        response = await grounded_chat_with_fallback(request)

    assert response.success is True
    assert response.provider == "gemini"
    assert "giu lai" in response.answer
    assert response.quality is not None
    assert response.quality.status in {"pass", "warn"}


async def test_grounded_chat_falls_back_when_provider_json_is_invalid():
    reset_provider_health_metrics()
    request = make_request()

    with patch(
        "services.grounded_chatbot.chat_with_fallback",
        AsyncMock(return_value=(True, "plain text invalid payload", "groq", None)),
    ):
        response = await grounded_chat_with_fallback(request)

    assert response.success is False
    assert response.provider == "none"
    assert "grounded" in response.answer.lower()
    assert response.quality is not None


async def test_grounded_chat_returns_safe_fallback_when_all_providers_fail():
    reset_provider_health_metrics()
    request = make_request()

    with patch(
        "services.grounded_chatbot.chat_with_fallback",
        AsyncMock(return_value=(False, "fallback", "none", "all providers failed")),
    ):
        response = await grounded_chat_with_fallback(request)

    assert response.success is False
    assert response.provider == "none"
    assert response.error == "all providers failed"
    assert "khong thay the bac si" in response.safety_note.lower()
    assert response.quality is not None


async def test_grounded_chat_rejects_provider_answer_that_fails_quality_guard():
    reset_provider_health_metrics()
    request = make_request()
    invalid_quality_payload = '{"answer":"Co the tiep tuc theo doi.","safety_note":"OK."}'

    with patch(
        "services.grounded_chatbot.chat_with_fallback",
        AsyncMock(return_value=(True, invalid_quality_payload, "groq", None)),
    ):
        response = await grounded_chat_with_fallback(request)

    assert response.success is False
    assert response.provider == "none"
    assert response.error is not None
    assert "quality guard" in response.error
