# Grounded Chatbot, Observability, And Data Pipeline Design

## Goal

Mở rộng phase AI theo thứ tự:

1. Chatbot end-user grounded theo recommendation hiện tại
2. Provider health metrics, circuit breaker, routing theo cost-latency
3. Audit log cho grounded payload và explanation/chat output
4. Pipeline dữ liệu production cho 1000+ diseases và 1000+ drugs
5. Monitoring/CI sâu hơn cho AI quality và fallback rate

## Current State

- Recommendation runtime hiện là `specialty -> disease -> symptom -> drug`.
- Backend giữ quyền quyết định recommendation và safety filtering.
- `ai-service` đã có:
  - `POST /ai/recommend`
  - `POST /ai/recommend/explain`
  - provider fallback `Gemini -> Groq -> Zhipu`
- Frontend đã hiển thị disease candidates, recommendation cards, explanation grounded/fallback.
- Chưa có chatbot end-user grounded.
- Chưa có health-aware provider router, circuit breaker, durable audit log, hay production sync pipeline hoàn chỉnh.

## Design Decisions

### 1. Grounded chatbot

- Chatbot chỉ hoạt động trong ngữ cảnh một recommendation hiện tại.
- Frontend mount chatbot ở `DrugSuggestion`.
- Frontend gửi:
  - `recommendationId`
  - `question`
  - grounded context đang render (`specialty`, `matchedSymptoms`, `topDiseases`, `recommendations`, `dangerAlert`)
- Backend phải xác thực `recommendationId` thuộc user hiện tại.
- Backend phải kiểm tra recommendation list gửi lên không lệch khỏi snapshot authoritative.
- `ai-service` phải có endpoint riêng cho grounded chat, không reuse thô `/ai/chat`.

### 2. Provider routing

- Tách provider router thành lớp dùng chung cho:
  - explanation
  - grounded chatbot
- Router sẽ lưu:
  - success/failure count
  - last latency
  - consecutive failures
  - breaker state
- Lựa chọn provider dựa trên:
  - breaker closed/open
  - health score
  - latency score
  - static cost priority

### 3. Audit log

- Không đủ chỗ để audit đầy đủ nếu chỉ giữ schema `recommendations` hiện tại.
- Cần migration mới cho bảng audit riêng hoặc mở rộng durable store.
- Audit event tối thiểu phải giữ:
  - recommendation id
  - user id
  - event type (`recommendation_explain`, `grounded_chat`)
  - grounded request payload canonical
  - provider chosen
  - response status
  - fallback reason
  - latency ms
  - created_at

### 4. Data pipeline

- `scrape-more-medical-data.js` là seed/review pipeline gần production nhất cho symptom/drug demo.
- `seed-disease-graph-data.js` đã target `1000+`, nhưng hiện còn pad synthetic review candidates.
- Production pipeline cần loại bỏ phụ thuộc vào synthetic filler cho target chính thức.
- Runtime tuyệt đối không được gọi free public APIs để ra recommendation cho user.

### 5. Monitoring and CI

- Backend và `ai-service` phải xuất health/metrics giàu thông tin hơn `status: ok`.
- CI mặc định tiếp tục chạy test suites local.
- Live/provider quality checks phải tách riêng khỏi default suite.
- Cần thêm smoke checks cho:
  - grounded chatbot contract
  - fallback semantics
  - provider-router health logic
  - data pipeline output minimums

## Phase Notes

- Task 1 có thể hoàn tất độc lập mà chưa cần migration audit hoặc router health-aware.
- Task 2 và Task 3 nên thiết kế cùng nhau để tránh ghi metrics một nơi, audit một nơi nhưng không cùng canonical payload.
- Task 4 phải coi `Clinical Tables + ICD-10` là nguồn disease chính, `RxTerms + RxNorm + openFDA` là nguồn drug chính, `Wikipedia` chỉ là fallback mô tả.
