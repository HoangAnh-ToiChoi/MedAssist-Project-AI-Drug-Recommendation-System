import os
import sys
from unittest.mock import AsyncMock, patch

import pytest

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import RecommendationExplainRequest
from services.recommendation_explainer import explain_recommendation_with_fallback
from services.provider_router import reset_provider_health_metrics

pytestmark = pytest.mark.asyncio


def make_request() -> RecommendationExplainRequest:
    return RecommendationExplainRequest(
        specialty="ho_hap",
        matched_symptoms=["ho", "sot"],
        danger_alert="Kho tho tang dan can duoc tham kham som",
        top_diseases=[
            {
                "code": "viem_phe_quan_cap",
                "display_name": "Viem phe quan cap",
                "icd10_code": "J20",
                "score": 0.87,
            }
        ],
        recommendations=[
            {
                "name": "Salbutamol",
                "generic_name": "Salbutamol",
                "confidence": 0.81,
                "reason": "Goi y dua tren trieu chung phu hop.",
                "dosage": "Theo huong dan su dung da duoc phe duyet.",
                "contraindications": "Than trong voi nguoi co benh tim mach.",
            }
        ],
    )


async def test_explainer_returns_provider_success_response():
    reset_provider_health_metrics()
    request = make_request()
    provider_payload = (
        '{"summary":"Tom tat grounded.","explanation":"Giai thich chi dua tren du lieu da cho.",'
        '"safety_note":"Thong tin chi mang tinh tham khao."}'
    )

    with patch("services.recommendation_explainer.try_gemini", AsyncMock(return_value=provider_payload)):
        with patch("services.recommendation_explainer.try_groq", AsyncMock(return_value=None)):
            with patch("services.recommendation_explainer.try_zhipu", AsyncMock(return_value=None)):
                response = await explain_recommendation_with_fallback(request)

    assert response.success is True
    assert response.provider == "gemini"
    assert response.summary == "Tom tat grounded."
    assert response.explanation == "Giai thich chi dua tren du lieu da cho."
    assert response.safety_note == "Thong tin chi mang tinh tham khao."
    assert response.error is None
    assert response.quality is not None
    assert response.quality.status in {"pass", "warn"}


async def test_explainer_falls_back_to_next_provider_when_first_is_invalid():
    reset_provider_health_metrics()
    request = make_request()
    invalid_payload = "This is not valid JSON"
    groq_payload = (
        '{"summary":"Tom tat tu Groq.","explanation":"Giai thich tu provider thu hai.",'
        '"safety_note":"Van can tham khao y kien chuyen mon."}'
    )

    with patch("services.recommendation_explainer.try_gemini", AsyncMock(return_value=invalid_payload)):
        with patch("services.recommendation_explainer.try_groq", AsyncMock(return_value=groq_payload)):
            with patch("services.recommendation_explainer.try_zhipu", AsyncMock(return_value=None)):
                response = await explain_recommendation_with_fallback(request)

    assert response.success is True
    assert response.provider == "groq"
    assert response.summary == "Tom tat tu Groq."
    assert response.explanation == "Giai thich tu provider thu hai."
    assert response.error is None
    assert response.quality is not None


async def test_explainer_returns_safe_deterministic_fallback_when_all_providers_fail():
    reset_provider_health_metrics()
    request = make_request()

    with patch("services.recommendation_explainer.try_gemini", AsyncMock(return_value=None)):
        with patch("services.recommendation_explainer.try_groq", AsyncMock(return_value=None)):
            with patch("services.recommendation_explainer.try_zhipu", AsyncMock(return_value=None)):
                response = await explain_recommendation_with_fallback(request)

    assert response.success is False
    assert response.provider == "none"
    assert "Chuyen khoa duoc danh gia: ho_hap." in response.summary
    assert "khong them thong tin moi" in response.explanation
    assert "Thong tin chi mang tinh tham khao." in response.safety_note
    assert response.error is not None
    assert response.quality is not None
    assert response.quality.disclaimer_present is True


async def test_explainer_rejects_provider_output_that_fails_quality_guard():
    reset_provider_health_metrics()
    request = make_request()
    invalid_quality_payload = (
        '{"summary":"Tom tat grounded.","explanation":"Giai thich ngan.",'
        '"safety_note":"OK."}'
    )

    with patch("services.recommendation_explainer.try_gemini", AsyncMock(return_value=invalid_quality_payload)):
        with patch("services.recommendation_explainer.try_groq", AsyncMock(return_value=None)):
            with patch("services.recommendation_explainer.try_zhipu", AsyncMock(return_value=None)):
                response = await explain_recommendation_with_fallback(request)

    assert response.success is False
    assert response.provider == "none"
    assert response.error is not None
    assert "quality guard" in response.error
