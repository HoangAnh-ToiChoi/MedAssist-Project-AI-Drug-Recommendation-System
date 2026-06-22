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
- Endpoint explain dùng prompt grounding chặt:
  - Không thêm thuốc mới.
  - Không thêm bệnh mới.
  - Không override allergy filtering, contraindication filtering hay danger alert của backend.
- Nếu cả Gemini, Groq và Zhipu đều lỗi hoặc trả sai format, hệ thống rơi về deterministic fallback explanation.
- Frontend đã render block `Giải thích gợi ý` và hiển thị rõ `LLM grounded` hoặc `Fallback`.

## Luồng chạy hiện tại

1. Frontend gửi specialty + symptoms lên backend.
2. Backend lấy disease graph result và lọc theo dị ứng, bệnh nền, chống chỉ định.
3. Backend gọi `ai-service` để xin explanation grounded cho chính payload đã lọc.
4. `ai-service` thử lần lượt `Gemini -> Groq -> Zhipu`.
5. Backend trả recommendation authoritative kèm `llmExplanation`.
6. Frontend render recommendation trước, explanation sau.

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

## Cách test

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

- Chưa có AI chatbot nghiệp vụ hoàn chỉnh cho end-user.
- Chưa có orchestration để chọn provider theo cost/latency/health score.
- Chưa log structured telemetry cho explanation quality theo provider.
- Chưa có review dashboard cho provenance và offline curation workflow.
- Chưa có production sync pipeline đầy đủ cho 1000+ disease và 1000+ drug records.

## Next step đề xuất

- Phase dữ liệu:
  - Sync offline từ Clinical Tables conditions + ICD-10 cho disease taxonomy.
  - Sync offline từ RxTerms + RxNorm + openFDA cho drug/ingredient.
  - Wikipedia chỉ giữ vai trò fallback mô tả.
  - DrugBank, DAV, CTDbase giữ ở lớp review/provenance.
- Phase AI:
  - Thêm response style presets cho chatbot/explainer.
  - Thêm provider health metrics và circuit breaker.
  - Thêm audit log cho grounded payload và explanation output.
- Phase CI/CD:
  - Chạy `backend`, `frontend`, `ai-service` trong CI mặc định.
  - Tách live AI tests khỏi default suite như hiện trạng và chỉ bật bằng env.
