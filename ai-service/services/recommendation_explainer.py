import json
import logging
import time
from typing import Dict, List, Optional, Tuple

from models.schemas import QualityCheck, RecommendationExplainRequest, RecommendationExplainResponse
from services.quality_guard import evaluate_grounded_response
from services.chatbot import try_gemini, try_groq, try_zhipu
from services.provider_router import (
    get_provider_health_snapshot,
    order_providers,
    record_provider_result,
)

logger = logging.getLogger("recommendation_explainer")

DEFAULT_DISCLAIMER = (
    "Thong tin chi mang tinh tham khao va khong thay the bac si hoac co so y te. "
    "Khong tu y them thuoc, doi thuoc, hoac bo qua canh bao an toan."
)


def _trim_text(value: Optional[str]) -> str:
    return (value or "").strip()


def _ensure_disclaimer(value: Optional[str]) -> str:
    text = _trim_text(value)
    normalized = text.lower()
    markers = ["tham khao", "bac si", "co so y te", "khong thay the", "khong tu y"]
    if any(marker in normalized for marker in markers):
        return text
    if not text:
        return DEFAULT_DISCLAIMER
    return f"{text} {DEFAULT_DISCLAIMER}"


def _build_fallback_response(error: Optional[str], request: RecommendationExplainRequest) -> RecommendationExplainResponse:
    disease_names = [d.display_name for d in request.top_diseases[:2] if _trim_text(d.display_name)]
    recommendation_names = [r.name for r in request.recommendations[:3] if _trim_text(r.name)]

    summary_parts = [
        f"Chuyen khoa duoc danh gia: {request.specialty}.",
        f"Trieu chung da doi chieu: {', '.join(request.matched_symptoms) if request.matched_symptoms else 'khong co'}.",
    ]
    if disease_names:
        summary_parts.append(f"Benh can nhac: {', '.join(disease_names)}.")
    if recommendation_names:
        summary_parts.append(f"Thuoc duoc giu lai sau bo loc: {', '.join(recommendation_names)}.")

    explanation_parts = [
        "Day la giai thich du phong duoc tao tu du lieu grounded da duoc backend loc san.",
        "He thong chi tom tat cac benh va thuoc da co trong payload, khong them thong tin moi.",
    ]
    if request.danger_alert:
        explanation_parts.append(f"Can chu y dau hieu canh bao: {request.danger_alert}.")
    if request.recommendations:
        explanation_parts.append("Cac goi y thuoc can duoc doi chieu voi di ung, chong chi dinh, va huong dan chuyen mon truoc khi su dung.")

    safety_note = _ensure_disclaimer(
        "Thong tin chi mang tinh tham khao. Khong tu y them thuoc, doi thuoc, hoac bo qua canh bao an toan tu backend. "
        "Neu trieu chung nang len hoac co dau hieu nguy hiem, can lien he bac si hoac co so y te."
    )

    quality = QualityCheck(**evaluate_grounded_response(
        main_text=" ".join(summary_parts + explanation_parts),
        safety_note=safety_note,
        danger_alert=request.danger_alert,
        grounded_entities=_collect_grounded_entities(request),
    ))

    return RecommendationExplainResponse(
        success=False,
        provider="none",
        summary=" ".join(summary_parts),
        explanation=" ".join(explanation_parts),
        safety_note=safety_note,
        error=error,
        quality=quality,
    )


def _collect_grounded_entities(request: RecommendationExplainRequest) -> List[str]:
    diseases = [d.display_name for d in request.top_diseases if _trim_text(d.display_name)]
    drugs = []
    for recommendation in request.recommendations:
        if _trim_text(recommendation.name):
            drugs.append(recommendation.name)
        if _trim_text(recommendation.generic_name):
            drugs.append(recommendation.generic_name)
    return diseases + drugs


def _build_messages(request: RecommendationExplainRequest) -> List[Dict[str, str]]:
    grounded_payload = {
        "specialty": request.specialty,
        "matched_symptoms": request.matched_symptoms,
        "danger_alert": request.danger_alert,
        "top_diseases": [d.model_dump() for d in request.top_diseases],
        "recommendations": [r.model_dump() for r in request.recommendations],
        "grounding_rules": request.grounding_rules.model_dump(),
    }

    system_prompt = (
        "You are a medical recommendation explainer working only from grounded backend data. "
        "You must not add any drug, disease, contraindication, dosage, or diagnosis that is not explicitly present in the payload. "
        "You must not override backend safety filtering, danger alerts, allergy filtering, or contraindication filtering. "
        "Keep the tone careful, non-diagnostic, and patient-friendly. "
        "Always preserve a medical disclaimer. "
        "Respond with valid JSON only using exactly these keys: summary, explanation, safety_note. "
        "Each value must be a plain string."
    )

    user_prompt = (
        "Explain the grounded recommendation result below in Vietnamese.\n"
        "Rules:\n"
        "- Do not add new drugs.\n"
        "- Do not add new diseases.\n"
        "- Do not add dosage instructions beyond the provided payload.\n"
        "- Mention danger_alert only if it exists.\n"
        "- Keep the explanation grounded in the given specialty, matched symptoms, top_diseases, recommendations, and grounding_rules.\n"
        "- If some fields are missing, stay concise and avoid guessing.\n\n"
        f"Grounded payload:\n{json.dumps(grounded_payload, ensure_ascii=True)}"
    )

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _extract_json_object(content: str) -> Optional[Dict[str, str]]:
    text = _trim_text(content)
    if not text:
        return None

    if text.startswith("```"):
        lines = text.splitlines()
        if lines:
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None

    try:
        parsed = json.loads(text[start:end + 1])
    except json.JSONDecodeError:
        return None

    if not isinstance(parsed, dict):
        return None

    summary = _trim_text(parsed.get("summary"))
    explanation = _trim_text(parsed.get("explanation"))
    safety_note = _ensure_disclaimer(parsed.get("safety_note"))
    if not summary or not explanation or not safety_note:
        return None

    return {
        "summary": summary,
        "explanation": explanation,
        "safety_note": safety_note,
    }


async def _try_provider(
    provider_name: str,
    provider_func,
    messages: List[Dict[str, str]],
) -> Tuple[Optional[RecommendationExplainResponse], Optional[str]]:
    try:
        content = await provider_func(messages, 0.2)
    except Exception as exc:
        logger.error("Provider %s raised an exception: %s", provider_name, str(exc))
        return None, f"{provider_name} provider raised an exception"

    if not content:
        return None, f"{provider_name} provider returned no content"

    parsed = _extract_json_object(content)
    if not parsed:
        logger.error("Provider %s returned invalid structured explanation content", provider_name)
        return None, f"{provider_name} provider returned invalid structured explanation content"

    return RecommendationExplainResponse(
        success=True,
        provider=provider_name,
        summary=parsed["summary"],
        explanation=parsed["explanation"],
        safety_note=parsed["safety_note"],
        error=None,
    ), None


async def explain_recommendation_with_fallback(
    request: RecommendationExplainRequest,
) -> RecommendationExplainResponse:
    messages = _build_messages(request)
    provider_chain = [
        ("gemini", try_gemini),
        ("groq", try_groq),
        ("zhipu", try_zhipu),
    ]

    errors: List[str] = []
    for provider_name, provider_func in order_providers(provider_chain):
        provider_state = get_provider_health_snapshot().get(provider_name, {})
        if provider_state.get("breaker_state") == "open":
            errors.append(f"{provider_name} skipped because circuit breaker is open")
            continue

        started = time.perf_counter()
        try:
            content = await provider_func(messages, 0.2)
        except Exception as exc:
            latency_ms = (time.perf_counter() - started) * 1000
            error_message = f"{provider_name} provider raised an exception: {str(exc)}"
            record_provider_result(provider_name, False, latency_ms, error_message)
            logger.error(error_message)
            errors.append(error_message)
            continue

        latency_ms = (time.perf_counter() - started) * 1000
        if not content:
            error_message = f"{provider_name} provider returned no content"
            record_provider_result(provider_name, False, latency_ms, error_message)
            errors.append(error_message)
            continue

        parsed = _extract_json_object(content)
        if parsed:
            quality = QualityCheck(**evaluate_grounded_response(
                main_text=f'{parsed["summary"]} {parsed["explanation"]}',
                safety_note=parsed["safety_note"],
                danger_alert=request.danger_alert,
                grounded_entities=_collect_grounded_entities(request),
            ))
            if quality.status == "fail":
                quality_error = f"{provider_name} provider failed grounded quality guard"
                record_provider_result(provider_name, False, latency_ms, quality_error)
                logger.error(quality_error)
                errors.append(quality_error)
                continue

            record_provider_result(provider_name, True, latency_ms, None)
            return RecommendationExplainResponse(
                success=True,
                provider=provider_name,
                summary=parsed["summary"],
                explanation=parsed["explanation"],
                safety_note=parsed["safety_note"],
                error=None,
                quality=quality,
            )

        invalid_error = f"{provider_name} provider returned invalid structured explanation content"
        record_provider_result(provider_name, False, latency_ms, invalid_error)
        logger.error(invalid_error)
        errors.append(invalid_error)

    error_message = (
        "All AI recommendation explanation providers (Gemini, Groq, Zhipu) failed or returned invalid structured output. "
        + " | ".join(errors)
    )
    logger.error(error_message)
    return _build_fallback_response(error_message, request)
