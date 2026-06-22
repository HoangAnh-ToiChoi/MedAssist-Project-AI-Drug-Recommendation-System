# Grounded LLM Explanation Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giữ backend là nguồn sự thật cho business rules và scoring, sau đó dùng Gemini/Groq/Zhipu qua `ai-service` để tạo phản hồi tự nhiên và giải thích recommendation mà không làm mất database grounding.

**Architecture:** Backend sẽ tính toàn bộ structured recommendation result trước, gồm specialty, matched symptoms, top diseases, recommendations, và safety filtering. Sau đó backend gọi một endpoint explanation mới ở `ai-service`; endpoint này chỉ được phép naturalize payload grounded sẵn có, không được thêm drug/disease mới. Frontend hiển thị structured data trước, explanation block sau, và vẫn hoạt động khi mọi provider đều fail.

**Tech Stack:** Node.js, Express, Awilix, node:test, FastAPI, httpx, pytest, React, Vite, Vitest, GitHub Actions

---

### Phase 0: Documentation Discovery

**Allowed APIs and patterns discovered from the current repo**

- Backend current grounded flow:
  - `RecommendationService.checkSymptoms(userId, specialty, symptoms)` in `backend/src/services/RecommendationService.js`
  - `RecommendationRepository.findDiseaseGraphRecommendations(specialty, symptomCodes)` in `backend/src/repositories/RecommendationRepository.js`
  - `DiseaseGraphRepository.findDiseaseCandidatesBySymptomCodes(...)` and `findDrugCandidatesByDiseaseIds(...)` in `backend/src/repositories/DiseaseGraphRepository.js`
- Backend current AI bridge:
  - `HttpAiServiceEngine.getRecommendations(specialty, symptoms, history, allergies)` posts to `${AI_SERVICE_URL}/ai/recommend`
  - `DatabaseFallbackEngine.getRecommendations(...)` already provides deterministic fallback
- AI service current provider bridge:
  - `chat_with_fallback(messages, temperature=0.7)` in `ai-service/services/chatbot.py`
  - provider order is `Gemini -> Groq -> Zhipu`
  - current endpoint is `POST /ai/chat` in `ai-service/routers/chat.py`
- Frontend current consumption:
  - `frontend/src/pages/SymptomInput.jsx` stores `drugSuggestions`
  - `frontend/src/pages/DrugSuggestion.jsx` reads `topDiseases`, `matchedSymptoms`, `dangerAlert`

**Anti-pattern guards**

- Do not let the LLM choose final drugs or final diseases.
- Do not make frontend depend on `llmExplanation` for base rendering.
- Do not move provider keys into frontend.
- Do not call public medical APIs at runtime.
- Do not overload `/ai/chat` with recommendation-specific contracts when a dedicated endpoint is clearer.

---

### Task 1: Establish baseline CI for backend, frontend, and ai-service

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Add GitHub Actions workflow for push/PR**

Create `.github/workflows/ci.yml` with three jobs:

- backend: `npm ci && npm test`
- frontend: `npm ci && npm run test && npm run build`
- ai-service: `pip install -r requirements.txt && pytest -q`

- [ ] **Step 2: Keep live AI tests disabled in CI**

Set:

```yaml
env:
  RUN_LIVE_AI_TESTS: "0"
```

for the ai-service test step so CI only runs deterministic tests.

- [ ] **Step 3: Verify locally**

Run:

```bash
cd backend && npm test
cd ../frontend && npm run test && npm run build
cd ../ai-service && pytest -q
```

Expected:

- backend tests pass
- frontend tests pass
- frontend build passes
- ai-service unit tests pass

---

### Task 2: Add recommendation-aware explanation contract to ai-service

**Files:**
- Create: `ai-service/routers/recommendation.py`
- Create: `ai-service/services/recommendation_explainer.py`
- Modify: `ai-service/models/schemas.py`
- Modify: `ai-service/main.py`
- Test: `ai-service/tests/test_recommendation_explainer.py`

- [ ] **Step 1: Add Pydantic request/response schemas**

Add schemas for:

- `GroundedDisease`
- `GroundedRecommendation`
- `RecommendationExplainRequest`
- `RecommendationExplainResponse`

to `ai-service/models/schemas.py`.

- [ ] **Step 2: Build prompt-safe explanation service**

Create `recommendation_explainer.py` that:

- receives grounded payload only;
- builds a strict system instruction:
  - do not add drugs;
  - do not add diseases;
  - preserve disclaimer tone;
- calls the existing provider fallback mechanism;
- returns `summary`, `explanation`, `safety_note`, `provider`, `success`, `error`.

- [ ] **Step 3: Expose `POST /ai/recommend/explain`**

Create a dedicated router instead of overloading `/ai/chat`.

- [ ] **Step 4: Add deterministic tests**

Write tests that verify:

- provider success returns structured explanation payload;
- fallback between providers still works;
- all-provider failure returns `success=False` with a safe fallback string.

- [ ] **Step 5: Verify**

Run:

```bash
cd ai-service && pytest -q
```

Expected: new explainer tests pass alongside existing chatbot tests.

---

### Task 3: Extend backend to request grounded explanation after deterministic recommendation

**Files:**
- Modify: `backend/src/services/ai/AIProvider.js`
- Modify: `backend/src/services/ai/HttpAiServiceEngine.js`
- Modify: `backend/src/services/RecommendationService.js`
- Modify: `backend/src/config/appConfig.js`
- Test: `backend/test/recommendationService.test.js`

- [ ] **Step 1: Extend AI provider contract**

Update `AIProvider` comments/signature expectations to support grounded explanation payloads and richer response fields.

- [ ] **Step 2: Add explain call in `HttpAiServiceEngine`**

Keep current deterministic `getRecommendations(...)` contract intact where needed, but add a dedicated method such as:

```js
async explainGroundedRecommendation(payload) {}
```

that posts to:

```text
POST ${AI_SERVICE_URL}/ai/recommend/explain
```

- [ ] **Step 3: Merge grounded explanation in `RecommendationService`**

After backend computes and filters final structured results:

- build a grounded explanation payload;
- call ai-service if `AI_SERVICE_URL` is configured;
- attach `llmExplanation` to the response if available;
- if explain call fails, attach a deterministic fallback explanation object.

- [ ] **Step 4: Keep deterministic success path**

Do not fail the whole recommendation request because explanation failed.

- [ ] **Step 5: Update tests**

Add tests for:

- explanation success path;
- explanation failure path with deterministic fallback;
- no-regression on allergy/history filtering.

- [ ] **Step 6: Verify**

Run:

```bash
cd backend && node --test test/recommendationService.test.js
```

Expected: all recommendation service tests pass.

---

### Task 4: Add backend route/integration coverage for enriched response

**Files:**
- Modify: `backend/test/specialtyRoutes.test.js`
- Create: `backend/test/recommendationRoutes.test.js` if route-level coverage is missing

- [ ] **Step 1: Add response assertions for explanation block**

Ensure route-level tests can validate:

- response still includes `specialty`, `matchedSymptoms`, `topDiseases`, `recommendations`
- `llmExplanation` is optional and non-breaking

- [ ] **Step 2: Verify missing-specialty behavior still holds**

Do not regress specialty validation already added in Task 4 of the previous phase.

- [ ] **Step 3: Verify**

Run:

```bash
cd backend && node --test
```

Expected: backend route tests pass without changing the deterministic core behavior.

---

### Task 5: Render explanation block in frontend without replacing structured cards

**Files:**
- Modify: `frontend/src/pages/DrugSuggestion.jsx`
- Create: `frontend/src/components/symptoms/RecommendationExplanationCard.jsx`
- Test: `frontend/src/pages/DrugSuggestion.test.jsx`

- [ ] **Step 1: Add explanation UI component**

Render:

- provider used
- short grounded summary
- natural-language explanation
- safety note

- [ ] **Step 2: Keep structured hierarchy primary**

Render order should remain:

1. specialty / matched symptoms summary
2. top diseases
3. structured recommendation cards
4. explanation card

- [ ] **Step 3: Handle missing explanation safely**

If `llmExplanation` is absent or failed:

- keep current result page working;
- optionally show a deterministic explanation block from backend.

- [ ] **Step 4: Add frontend tests**

Test:

- explanation block renders when provided
- page still renders when explanation is missing

- [ ] **Step 5: Verify**

Run:

```bash
cd frontend && npm run test && npm run build
```

Expected: frontend tests and build pass.

---

### Task 6: Add operational configuration and docs for AI phase

**Files:**
- Modify: `README.md`
- Modify: `backend/.env.example`
- Modify: `ai-service/.env` only if local developer notes are needed, but do not commit secrets
- Modify: `docs/superpowers/specs/2026-06-22-grounded-llm-explanation-design.md`

- [ ] **Step 1: Document provider ownership**

Clarify that:

- provider keys live in `ai-service`
- backend only talks to `AI_SERVICE_URL`
- backend remains source of truth for business logic

- [ ] **Step 2: Document failure behavior**

Clarify that:

- if Gemini/Groq/Zhipu all fail,
- recommendation still returns grounded output,
- explanation degrades gracefully.

- [ ] **Step 3: Verify docs consistency**

Run:

```bash
rg -n "AI_SERVICE_URL|Gemini|Groq|Zhipu|grounded|llmExplanation" README.md backend/.env.example docs/superpowers/specs/2026-06-22-grounded-llm-explanation-design.md
```

Expected: all key terms are documented consistently.

---

### Final Verification

- [ ] Run:

```bash
cd backend && npm test
cd ../frontend && npm run test && npm run build
cd ../ai-service && pytest -q
```

- [ ] Confirm CI workflow file exists:

```bash
test -f .github/workflows/ci.yml && echo ok
```

- [ ] Confirm no direct runtime public medical API call was added in frontend/backend request path:

```bash
rg -n "clinicaltables|openfda|rxnav|wikipedia" backend/src frontend/src ai-service
```

Expected: only seed/offline scripts or docs may reference public medical sources.
