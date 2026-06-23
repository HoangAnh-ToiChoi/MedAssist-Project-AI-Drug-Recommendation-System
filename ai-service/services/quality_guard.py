from typing import List


DISCLAIMER_MARKERS = [
    "tham khao",
    "bac si",
    "co so y te",
    "khong thay the",
    "khong tu y",
    "lien he",
    "doctor",
    "medical",
    "clinician",
]


def _normalize(text: str) -> str:
    return str(text or "").strip().lower()


def _contains_any(text: str, markers: List[str]) -> bool:
    normalized = _normalize(text)
    return any(marker in normalized for marker in markers)


def evaluate_grounded_response(
    *,
    main_text: str,
    safety_note: str,
    danger_alert: str | None,
    grounded_entities: List[str],
):
    notes: List[str] = []
    disclaimer_present = _contains_any(safety_note, DISCLAIMER_MARKERS) or _contains_any(
        main_text,
        ["tham khao", "bac si", "khong thay the"],
    )
    if not disclaimer_present:
        notes.append("missing_medical_disclaimer")

    normalized_text = _normalize(f"{main_text} {safety_note}")
    grounded_entities = [_normalize(entity) for entity in grounded_entities if _normalize(entity)]
    grounded_entity_count = sum(1 for entity in grounded_entities if entity in normalized_text)
    grounded_entity_total = len(grounded_entities)

    danger_alert_considered = True
    if danger_alert:
        danger_alert_considered = _normalize(danger_alert) in normalized_text
        if not danger_alert_considered:
            notes.append("danger_alert_not_reflected")

    score = 1.0
    if not disclaimer_present:
        score -= 0.45
    no_grounded_entity_reflected = grounded_entity_total > 0 and grounded_entity_count == 0
    if no_grounded_entity_reflected:
        score -= 0.25
        notes.append("no_grounded_entity_reflected")
    if danger_alert and not danger_alert_considered:
        score -= 0.15
    score = max(0.0, round(score, 2))

    status = "pass"
    if not disclaimer_present or no_grounded_entity_reflected:
        status = "fail"
    elif score < 0.7:
        status = "warn"

    return {
        "status": status,
        "score": score,
        "grounded_entity_count": grounded_entity_count,
        "grounded_entity_total": grounded_entity_total,
        "disclaimer_present": disclaimer_present,
        "danger_alert_considered": danger_alert_considered,
        "notes": notes,
    }
