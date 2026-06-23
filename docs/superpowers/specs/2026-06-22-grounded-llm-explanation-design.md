# Grounded LLM Explanation Design

**Date:** 2026-06-22  
**Status:** Draft for review  
**Author:** Codex with superpowers brainstorming flow

---

## 1. Problem Statement

MedAssist has now moved its core recommendation flow to `specialty -> disease -> symptom -> drug`, which is much safer and more explainable than a flat symptom-to-drug mapping. However, the product still lacks a good natural-language explanation layer:

- backend recommendations are grounded in database data and business rules, but the response text is still fairly mechanical;
- `ai-service` already contains provider fallback support for `Gemini -> Groq -> Zhipu`, but it is currently exposed through `/ai/chat`, not through a recommendation-aware explanation contract;
- the application needs a controlled way to use LLMs for explanation without letting them invent diseases, drugs, or unsafe instructions;
- the team wants business-critical logic to stay deterministic and grounded in real data.

The next phase should therefore make backend the authority for recommendation computation, and use LLM providers only to naturalize, summarize, and explain already-grounded results.

---

## 2. Goals

- Keep recommendation ranking, safety filtering, and grounding inside backend/database logic.
- Introduce a dedicated AI explanation contract for grounded recommendation results.
- Allow provider fallback through `Gemini`, `Groq`, and `Zhipu`.
- Ensure the LLM can only explain, not decide the final drug set.
- Return a richer response that includes both structured grounded data and optional natural-language explanation.
- Make the AI layer resilient: if all LLM providers fail, the system still returns safe structured results from backend.
- Prepare the codebase for a later chatbot phase without coupling critical recommendation logic to open-ended chat behavior.

## 3. Non-Goals

- Replacing backend scoring with end-to-end LLM diagnosis.
- Letting external APIs directly determine final recommendation ranking.
- Real-time public medical API calls during user-facing recommendation requests.
- Production deployment automation in this phase beyond establishing basic CI.
- Fully general medical chatbot behavior for all screens.

---

## 4. Current State Discovery

### 4.1 Backend Grounding

Current backend recommendation flow already computes:

- `specialty`
- normalized / matched symptoms
- `topDiseases`
- filtered drug recommendations
- danger alerts

Key current code paths:

- `backend/src/services/RecommendationService.js`
- `backend/src/repositories/RecommendationRepository.js`
- `backend/src/repositories/DiseaseGraphRepository.js`
- `backend/src/services/ai/DatabaseFallbackEngine.js`
- `backend/src/services/ai/HttpAiServiceEngine.js`

### 4.2 AI Service

Current AI service exposes:

- `POST /ai/chat`
- provider fallback order `Gemini -> Groq -> Zhipu`

Key current code paths:

- `ai-service/routers/chat.py`
- `ai-service/services/chatbot.py`

Current provider keys are configured in `ai-service/.env`, not in backend:

- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `ZHIPU_API_KEY`

The backend `.env` does not currently hold those provider keys.

### 4.3 Gap

The current split is mismatched:

- backend knows grounded recommendation state,
- ai-service knows how to call providers,
- but there is no recommendation-aware explanation endpoint connecting the two.

---

## 5. Architecture Decision

### 5.1 Authoritative Split

The authoritative split for this phase is:

- **Backend owns** business rules, scoring, grounding, safety filtering, and structured result assembly.
- **AI service owns** provider fallback and natural-language generation over a constrained grounded payload.

### 5.2 New Request Direction

Runtime flow should become:

`frontend -> backend grounded recommendation -> backend optional explain call -> ai-service provider fallback -> backend merged response -> frontend`

### 5.3 Deterministic-First Rule

Every recommendation request must succeed deterministically without any provider response.

This means:

- backend must compute the final structured recommendation result first;
- ai-service may enrich the response with explanation text;
- if explanation fails, backend still returns structured output with a deterministic fallback explanation string.

---

## 6. Recommendation Explanation Contract

### 6.1 New AI Service Endpoint

Add a recommendation-aware endpoint:

- `POST /ai/recommend/explain`

Purpose:

- transform a grounded recommendation payload into natural-language output;
- summarize why the diseases and drugs were chosen;
- reinforce safety warnings and business guardrails;
- avoid adding any drug or disease not already present in the payload.

### 6.2 Input Shape

Suggested input:

```json
{
  "specialty": "ho_hap",
  "matched_symptoms": ["ho", "sot"],
  "danger_alert": null,
  "top_diseases": [
    {
      "code": "viem_phe_quan_cap",
      "display_name": "Viêm phế quản cấp",
      "icd10_code": "J20",
      "score": 0.87
    }
  ],
  "recommendations": [
    {
      "name": "Salbutamol",
      "generic_name": "Salbutamol",
      "confidence": 0.81,
      "reason": "Gợi ý thuốc dựa trên 2 triệu chứng phù hợp.",
      "dosage": "Theo chỉ định của bác sĩ hoặc hướng dẫn sử dụng.",
      "contraindications": "..."
    }
  ],
  "grounding_rules": {
    "provider_must_not_add_new_drugs": true,
    "provider_must_not_add_new_diseases": true,
    "provider_must_keep_medical_disclaimer": true
  }
}
```

### 6.3 Output Shape

Suggested output:

```json
{
  "success": true,
  "provider": "gemini",
  "summary": "Bạn đang được đánh giá trong chuyên khoa Hô hấp...",
  "explanation": "Các thuốc được giữ lại vì phù hợp với triệu chứng và đã qua bộ lọc an toàn...",
  "safety_note": "Thông tin chỉ mang tính tham khảo...",
  "error": null
}
```

---

## 7. Business Rules And Guardrails

### 7.1 Hard Rules Stay In Backend

The following logic must remain deterministic in backend:

- specialty scoping
- symptom normalization
- disease candidate scoring
- drug candidate selection
- allergy filtering
- contraindication filtering
- max recommendation caps
- danger-alert detection

### 7.2 LLM Constraints

The LLM layer must be constrained to:

- explain why the existing diseases/drugs were selected;
- summarize symptom-to-disease-to-drug reasoning in natural language;
- restate disclaimers and next-step guidance;
- optionally rephrase for patient readability.

The LLM layer must not:

- add a new disease not present in `top_diseases`;
- add a new drug not present in `recommendations`;
- override contraindication filtering;
- claim certainty beyond grounded scores;
- produce dosage instructions beyond the grounded text provided.

### 7.3 Fallback Behavior

If all providers fail:

- backend returns `llmExplanation.status = "failed"` (or similar metadata);
- backend includes a deterministic explanation string assembled from grounded fields;
- frontend still renders structured result cards normally.

---

## 8. API And Response Changes

### 8.1 Backend Response Extension

Extend current recommendation result with an optional explanation block:

```json
{
  "id": "rec-123",
  "specialty": "ho_hap",
  "matchedSymptoms": ["ho", "sot"],
  "topDiseases": [],
  "recommendations": [],
  "engineVersion": "disease-graph-v1",
  "dangerAlert": null,
  "llmExplanation": {
    "enabled": true,
    "provider": "gemini",
    "summary": "...",
    "explanation": "...",
    "safetyNote": "...",
    "status": "success"
  }
}
```

### 8.2 Backward Compatibility

Existing consumers must continue working if `llmExplanation` is absent.

Frontend can progressively enhance:

- phase 1: ignore `llmExplanation` if unavailable;
- phase 2: render summary/explanation card when present.

---

## 9. Provider Strategy

### 9.1 Provider Order

Keep provider fallback order:

1. `Gemini`
2. `Groq`
3. `Zhipu`

### 9.2 Provider Ownership

Provider SDK/API keys remain in `ai-service`, not backend, unless a later security/ops decision explicitly centralizes them elsewhere.

### 9.3 Configuration Notes

Current repository reality:

- `ai-service/.env` has configured provider keys;
- backend currently only knows `AI_SERVICE_URL`, not individual provider keys;
- this phase should preserve that separation.

---

## 10. Frontend Behavior

Frontend should remain structured-first:

- render specialty, matched symptoms, top diseases, and recommendations from grounded backend fields;
- add an explanation panel only if `llmExplanation` exists;
- preserve warning banners and disclaimers even if explanation is missing;
- never block result rendering on LLM availability.

---

## 11. Observability

This phase should log:

- whether explanation was requested;
- which provider succeeded;
- fallback chain attempts;
- explain-call timeout/failure reasons;
- whether deterministic fallback explanation was used.

Secrets must never be logged.

---

## 12. CI/CD Expectations For This Phase

This phase should rely on baseline CI:

- backend tests
- frontend tests and build
- ai-service tests with live provider tests disabled by default

CD should remain a later rollout concern, but CI must be present immediately so the new AI explanation contract is protected from regressions.

---

## 13. Acceptance Criteria

This phase is complete when:

- backend still computes final recommendations without any LLM dependency;
- ai-service exposes a recommendation-aware explanation endpoint;
- backend can optionally call ai-service for grounded explanation;
- if providers fail, response still succeeds with deterministic grounded data;
- frontend can display the explanation block without replacing structured cards;
- CI runs backend, frontend, and ai-service test suites on push/PR.
