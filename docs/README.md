# AI Phase README

Tài liệu này tóm tắt phase AI hiện tại của MedAssist theo hướng: rule/data giữ quyền quyết định, LLM chỉ diễn giải kết quả đã được grounding.

## Mục tiêu hiện tại

- Bắt user chọn `specialty` trước.
- Suy luận trong phạm vi chuyên khoa theo flow `disease -> symptom -> drug`.
- Ưu tiên dữ liệu thật và business rules ở backend.
- Dùng Gemini, Groq, Zhipu để tạo diễn giải tự nhiên, nhưng không cho LLM tự ý quyết định nghiệp vụ y tế.

## Trạng thái đã xong

- Backend đã trả về kết quả recommendation grounded gồm:
  - `matchedSymptoms`
  - `topDiseases`
  - `recommendations`
  - `dangerAlert`
- `ai-service` đã có endpoint `POST /ai/recommend/explain`.
- `ai-service` đã có endpoint `POST /ai/chat/recommendation` cho grounded chatbot theo từng recommendation.
- Endpoint explain dùng prompt grounding chặt:
  - Không thêm thuốc mới.
  - Không thêm bệnh mới.
  - Không override allergy filtering, contraindication filtering hay danger alert của backend.
- Nếu cả Gemini, Groq và Zhipu đều lỗi hoặc trả sai format, hệ thống rơi về deterministic fallback explanation.
- `ai-service` đã có provider router theo health/cost/latency với circuit breaker và `/health` trả `provider_health`.
- Backend đã có durable `ai_audit_logs` schema + best-effort audit emission cho `recommendation_explanation` và `grounded_chatbot`.
- `ai-service` đã có quality guard heuristic cho grounded explanation/chat:
  - giữ medical disclaimer
  - phản chiếu grounded entities hiện có
  - hạ cấp về fallback nếu output hợp lệ về JSON nhưng fail quality tối thiểu
- Frontend đã render block `Giải thích gợi ý` và hiển thị rõ `LLM grounded` hoặc `Fallback`.
- Frontend đã mount grounded chatbot ngay trong `DrugSuggestion`.

## Luồng chạy hiện tại

1. Frontend gửi specialty + symptoms lên backend.
2. Backend lấy disease graph result và lọc theo dị ứng, bệnh nền, chống chỉ định.
3. Backend gọi `ai-service` để xin explanation grounded cho chính payload đã lọc.
4. `ai-service` route provider động theo health/cost/latency và tự fallback khi provider lỗi.
5. Backend persist audit metadata cho explain/chat theo kiểu best-effort.
6. Backend trả recommendation authoritative kèm `llmExplanation`.
7. Frontend render recommendation trước, explanation/chat sau.

## Endpoint quan trọng

### Backend

- Recommendation API nội bộ vẫn đi qua backend.
- Backend là lớp authoritative cho:
  - specialty scoping
  - disease ranking
  - symptom matching
  - drug filtering
  - safety constraints

### AI Service

- `POST /ai/chat`
  - Chatbot/fallback playground cho nhiều provider.
- `POST /ai/recommend`
  - Recommendation engine contract nội bộ.
- `POST /ai/recommend/explain`
  - Nhận grounded payload từ backend và trả explanation dạng cấu trúc:
    - `success`
    - `provider`
    - `summary`
    - `explanation`
    - `safety_note`
    - `error`
- `POST /ai/chat/recommendation`
  - Nhận grounded recommendation context + conversation ngắn và trả câu trả lời end-user trong phạm vi payload đã được backend xác thực.
- `GET /health`
  - Trả `provider_health` để theo dõi health router và breaker state.

## Biến môi trường

### Backend

```env
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT_MS=1500
```

### AI Service

Cần có `.env` với provider keys tương ứng nếu muốn dùng live provider:

```env
GEMINI_API_KEY=...
GROQ_API_KEY=...
ZHIPU_API_KEY=...
```

Deploy `ai-service` lên Railway:

```bash
Root Directory: ai-service
Start Command: uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
Health Check Path: /health
```

Biến môi trường tối thiểu trên Railway:

```env
GEMINI_API_KEY=...
GROQ_API_KEY=...
ZHIPU_API_KEY=...
GEMINI_MODEL=...
GROQ_MODEL=...
ZHIPU_MODEL=...
AI_PROVIDER_BREAKER_FAILURE_THRESHOLD=2
AI_PROVIDER_BREAKER_COOLDOWN_SECONDS=30
```

## Cách test

### Data pipeline

Offline guardrail check:

```bash
node scripts/check-disease-graph-pipeline.js
```

AI observability guardrail check:

```bash
node scripts/check-ai-observability.js
```

Audit review report from real DB logs:

```bash
node scripts/report-ai-audit-log.js
node scripts/report-ai-audit-log.js --days=3 --event-type=grounded_chatbot
node scripts/report-ai-audit-log.js --provider=gemini --limit=50
```

Grounded auto-eval smoke suite:

```bash
node scripts/run-ai-evals.js
```

Backend AI insights endpoints for authenticated users:

```text
GET /api/v1/ai/insights/summary?days=7
GET /api/v1/ai/insights/events?days=7&limit=10
```

Frontend review page:

```text
/ai-insights
```

DB rollout checklist:

```text
docs/database/checklists/2026-06-23-phase-ai-migration-seed-checklist.md
```

Production-intent disease graph seed run without synthetic padding:

```bash
node scripts/seed-disease-graph-data.js --strict --min-diseases=1000 --min-drugs=1000
```

Review `data/crawled/disease-graph/scrape_report.json` before import. `strict_status.passed` must be `true`, and synthetic row counts must stay at `0` for both diseases and drugs.

### AI service

```bash
cd ai-service
python3 -m pytest -q
```

Live test mặc định không chạy:

```bash
cd ai-service
RUN_LIVE_AI_TESTS=1 pytest -q
```

### Backend

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm run test
npm run build
```

## Những gì phase AI chưa làm

- Chưa có review dashboard hay analytics UI cho audit/provenance.
- Chưa có integration migration flow để apply `ai_audit_logs` vào DB production tự động.
- Chưa có production sync pipeline bảo đảm `1000+ / 1000+` nếu public-source coverage thực tế không đạt ngưỡng strict mode.
- Chưa có AI phase cho end-user chatbot đa lượt nâng cao và routing theo cost SLA thực tế.
- Quality evaluation sâu hơn hiện đã có curated smoke auto-eval + audit CLI/report, nhưng chưa có benchmark set lớn hay auto judge pipeline riêng.

## Next step đề xuất

- Phase dữ liệu:
  - Sync offline từ Clinical Tables conditions + ICD-10 cho disease taxonomy.
  - Sync offline từ RxTerms + RxNorm + openFDA cho drug/ingredient.
  - Wikipedia chỉ giữ vai trò fallback mô tả.
  - DrugBank, DAV, CTDbase giữ ở lớp review/provenance.
- Phase AI:
  - Thêm response style presets cho chatbot/explainer.
  - Mở rộng AI Insights thành admin analytics hoàn chỉnh khi branch admin được nhập vào workspace hiện tại.
  - Bổ sung benchmark/auto-eval sâu hơn cho explanation/chat theo provider với tập ca lớn hơn.
- Phase CI/CD:
  - Chạy `backend`, `frontend`, `ai-service` trong CI mặc định.
  - Tách live AI tests khỏi default suite như hiện trạng và chỉ bật bằng env.
