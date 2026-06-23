import json
import logging
from typing import Dict, List, Optional

from models.schemas import GroundedChatRequest, GroundedChatResponse, QualityCheck
from services.quality_guard import evaluate_grounded_response
from services.chatbot import chat_with_fallback

logger = logging.getLogger("grounded_chatbot")


def _trim_text(value: Optional[str]) -> str:
    return (value or "").strip()


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

    answer = _trim_text(parsed.get("answer"))
    safety_note = _trim_text(parsed.get("safety_note"))
    if not answer or not safety_note:
        return None

    return {
        "answer": answer,
        "safety_note": safety_note,
    }


def _build_fallback_response(error: Optional[str], request: GroundedChatRequest) -> GroundedChatResponse:
    disease_names = [d.display_name for d in request.top_diseases[:2] if _trim_text(d.display_name)]
    recommendation_names = [r.name for r in request.recommendations[:3] if _trim_text(r.name)]

    answer_parts = [
        "Toi chi co the giai thich trong pham vi ket qua grounded ma backend da duyet.",
        f"Chuyen khoa hien tai: {request.specialty}.",
    ]
    if request.matched_symptoms:
        answer_parts.append(f"Trieu chung da doi chieu: {', '.join(request.matched_symptoms)}.")
    if disease_names:
        answer_parts.append(f"Cac benh dang duoc can nhac: {', '.join(disease_names)}.")
    if recommendation_names:
        answer_parts.append(f"Cac thuoc con lai sau bo loc an toan: {', '.join(recommendation_names)}.")
    if request.danger_alert:
        answer_parts.append(f"Canh bao an toan hien co: {request.danger_alert}.")
    answer_parts.append(
        "Neu ban can, hay hoi ro hon ve ly do goi y, khi nao nen di kham, hoac cach doc canh bao an toan."
    )

    safety_note = (
        "Thong tin chi mang tinh tham khao va khong thay the bac si. "
        "Khong tu y them thuoc, doi thuoc, hoac bo qua canh bao da duoc backend loc san."
    )

    quality = QualityCheck(**evaluate_grounded_response(
        main_text=" ".join(answer_parts),
        safety_note=safety_note,
        danger_alert=request.danger_alert,
        grounded_entities=_collect_grounded_entities(request),
    ))

    return GroundedChatResponse(
        success=False,
        provider="none",
        answer=" ".join(answer_parts),
        safety_note=safety_note,
        error=error,
        quality=quality,
    )


def _collect_grounded_entities(request: GroundedChatRequest) -> List[str]:
    diseases = [d.display_name for d in request.top_diseases if _trim_text(d.display_name)]
    drugs = []
    for recommendation in request.recommendations:
        if _trim_text(recommendation.name):
            drugs.append(recommendation.name)
        if _trim_text(recommendation.generic_name):
            drugs.append(recommendation.generic_name)
    return diseases + drugs


def _build_messages(request: GroundedChatRequest) -> List[Dict[str, str]]:
    grounded_payload = {
        "question": request.question,
        "specialty": request.specialty,
        "matched_symptoms": request.matched_symptoms,
        "danger_alert": request.danger_alert,
        "top_diseases": [d.model_dump() for d in request.top_diseases],
        "recommendations": [r.model_dump() for r in request.recommendations],
        "history": request.history,
        "allergies": request.allergies,
        "grounding_rules": request.grounding_rules.model_dump(),
    }

    system_prompt = (
        "You are a grounded medical support chatbot working only from backend-approved recommendation data. "
        "You must not add any new drugs, diseases, diagnoses, contraindications, or dosage instructions that are not in the payload. "
        "You must not override backend filtering, safety alerts, allergy filtering, or contraindication filtering. "
        "You may explain why a recommendation remained, why caution is needed, or when to seek care, but you must stay conservative and non-diagnostic. "
        "Always preserve a medical disclaimer. "
        "Respond with valid JSON only using exactly these keys: answer, safety_note."
    )

    user_prompt = (
        "Answer the user's question in Vietnamese using only the grounded payload below.\n"
        "Rules:\n"
        "- Do not add new drugs.\n"
        "- Do not add new diseases.\n"
        "- Do not recommend changing medication without clinician advice.\n"
        "- Mention danger_alert only if it exists.\n"
        "- If the question goes beyond the grounded payload, say the system only supports explanation within the current recommendation context.\n\n"
        f"Grounded payload:\n{json.dumps(grounded_payload, ensure_ascii=True)}"
    )

    messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for turn in request.conversation[-6:]:
        if turn.role in {"user", "assistant"} and _trim_text(turn.content):
            messages.append({"role": turn.role, "content": turn.content})
    messages.append({"role": "user", "content": user_prompt})
    return messages


async def grounded_chat_with_fallback(request: GroundedChatRequest) -> GroundedChatResponse:
    messages = _build_messages(request)
    success, content, provider, error = await chat_with_fallback(messages, temperature=0.2)

    if success and content:
        parsed = _extract_json_object(content)
        if parsed:
            quality = QualityCheck(**evaluate_grounded_response(
                main_text=parsed["answer"],
                safety_note=parsed["safety_note"],
                danger_alert=request.danger_alert,
                grounded_entities=_collect_grounded_entities(request),
            ))
            if quality.status != "fail":
                return GroundedChatResponse(
                    success=True,
                    provider=provider,
                    answer=parsed["answer"],
                    safety_note=parsed["safety_note"],
                    error=None,
                    quality=quality,
                )

            error = f"{provider} provider failed grounded chat quality guard"
            logger.error(error)
            fallback_response = _build_fallback_response(error, request)
            fallback_response.quality = quality
            return fallback_response
        error = f"{provider} provider returned invalid grounded chat JSON"
        logger.error(error)

    return _build_fallback_response(error, request)
