# 🏥 MedAssist AI

> Hệ thống gợi ý thuốc theo cụm triệu chứng và tiền sử bệnh  
> **Đề tài 95** | Nhóm 5 người | Deadline nội bộ: **10/6/2026**

---

## 📌 Đọc file này trước khi làm bất cứ điều gì

File này là **bộ nhớ chung của dự án**. Mọi quyết định quan trọng, nguyên tắc làm việc, và cấu trúc hệ thống đều được ghi ở đây. Khi có thắc mắc → đọc file này trước, sau đó mới hỏi.

---

## 👥 Thành viên & Vai trò

| Người | Vai trò | Tech phụ trách | Output bắt buộc |
|---|---|---|---|
| **Nguyên** | BA/PO · AI Engine | Python · FastAPI · scikit-learn | Đặc tả · User Story · Backlog · AI API |
| **Khoa** | UI/UX · Frontend | React · TailwindCSS · Axios · Figma | Figma wireframe · Source code Frontend |
| **HA** ⭐ | Backend · **Leader** | Node.js · Express · Redis · JWT | Source code API · Postman document |
| **Tín** | Database · DevOps | PostgreSQL · Supabase · Vercel · Railway | ERD · Script SQL · Link deploy |
| **Tiến** | Tester · QA | Postman · manual test · Google Sheet | Test Case · Bug Report |

⭐ HA là người quyết định cuối cùng về scope, kỹ thuật, và tiến độ.

---

## 🏗️ Kiến trúc hệ thống

```
[Browser - React]
      │ HTTPS
      ▼
[Vercel - Frontend static host]
      │ REST /api
      ▼
[Railway - Backend: Node.js :5000]
      │                    │
      │ HTTP internal       │ pg query
      ▼                    ▼
[Railway - AI: FastAPI :8000]   [Supabase - PostgreSQL]
                                      ▲
                                      │ Redis cache
                               [Redis - Railway]
```

**Nguyên tắc quan trọng:**
- Frontend **không bao giờ** gọi trực tiếp sang AI service
- Luồng bắt buộc: `FE → Backend → AI service → trả kết quả về FE`
- AI service chỉ nhận call từ Backend, không expose ra ngoài

---

## 🔧 Tech Stack

| Layer | Công nghệ | Người phụ trách |
|---|---|---|
| Frontend | React.js · TailwindCSS · Axios · React Router | Khoa |
| Backend API | Node.js · Express.js · JWT · Redis | HA |
| AI Engine | Python · FastAPI · scikit-learn · pandas | Nguyên |
| Database | PostgreSQL · Supabase (free tier) | Tín |
| Deploy FE | Vercel | Tín |
| Deploy BE + AI | Railway | Tín |
| Design | Figma | Khoa |
| Testing | Postman · manual · Google Sheet | Tiến |

---

## 🏛️ Kiến trúc Backend — 4 tầng OOP

Backend đi theo pattern **Route → Controller → Service → Repository**. Đây là nguyên tắc cứng, không được bỏ qua tầng.

```
Route         → Khai báo đường dẫn + gắn middleware. KHÔNG có logic.
Controller    → Nhận req, validate, gọi Service, trả res. KHÔNG đụng DB.
Service       → Toàn bộ business logic. KHÔNG biết req/res tồn tại.
Repository    → Chỉ query DB bằng SQL thuần. KHÔNG có logic.
```

**Quy tắc bắt buộc:**
- Mỗi tầng là **1 class riêng biệt**
- Không viết business logic trong Controller
- Không viết SQL trong Service
- Không dùng Prisma — Repository tự viết SQL
- Constructor nhận dependencies (dependency injection)

**Ví dụ đúng:**
```javascript
// ✅ ĐÚNG — Service không biết req/res
class AuthService {
  constructor(userRepository, redisClient) {
    this.userRepo = userRepository
    this.redis   = redisClient
  }
  async login(email, password) { /* business logic */ }
}

// ❌ SAI — Service không được nhận req
class AuthService {
  async login(req, res) { /* sai hoàn toàn */ }
}
```

---

## 🗃️ Database — 8 bảng

```
users               → Tài khoản người dùng (role: user | admin)
refresh_tokens      → JWT refresh token (có expires_at + revoked flag)
symptoms            → Danh mục triệu chứng
drugs               → Danh mục thuốc (có contraindications)
drug_symptoms       → Mapping N-N triệu chứng ↔ thuốc (confidence_score)
patient_history     → Tiền sử bệnh của từng user
allergies           → Dị ứng thuốc của từng user
recommendations     → Lịch sử AI predict (input/output dạng JSONB)
```

Chi tiết schema xem tại: `docs/database/schema.sql`  
ERD xem tại: `docs/database/ERD.png` (Tín cập nhật)

---

## 🔌 API Contract — Backend ↔ AI Service

Backend (Node.js) gọi sang AI service (FastAPI) qua HTTP internal:

```
POST http://localhost:8000/ai/recommend

Request:
{
  "symptoms":  ["sot", "dau_dau"],
  "history":   ["tieu_duong"],
  "allergies": ["penicillin"]
}

Response:
{
  "recommendations": [
    { "drug": "Paracetamol 500mg", "confidence": 0.90, "reason": "Hạ sốt cơ bản" }
  ],
  "total": 1,
  "engine_version": "rule-based-v1"
}
```

File contract đầy đủ: `docs/api-contracts/be-ai-contract.md`  
Postman collection: `docs/api-contracts/MedAssist.postman_collection.json` (HA cập nhật)

## 🧭 Disease Graph v1

- User phải chọn `specialty` trước khi duyệt hoặc gửi triệu chứng.
- Backend recommendation đang chuyển sang flow `specialty -> disease -> symptom -> drug`.
- Runtime không gọi API public về bệnh/thuốc; các nguồn như Clinical Tables, ICD-10, RxTerms, RxNorm, openFDA chỉ dùng cho seed/sync offline.
- `drug_symptoms` vẫn có thể được giữ làm lớp compatibility/fallback, nhưng hướng chính là disease graph theo chuyên khoa.

### Ghi chú tích hợp `ai-service`

- Dữ liệu thuốc hiện tại vẫn nên xem là seed/demo, chưa phải bộ dữ liệu production-ready.
- Với drug data thật, cần tiếp tục fetch và hợp nhất từ nhiều nguồn công khai thay vì phụ thuộc vào một nguồn đơn lẻ.
- Ưu tiên thực tế nên là `openFDA` cho dữ liệu cấu trúc, `Wikipedia` làm fallback tham khảo, rồi mở rộng thêm `DrugBank`, `DAV`, `CTDbase` và các nguồn công khai phù hợp thị trường Việt Nam.
- Trước khi đẩy vào các bảng như `drugs` hoặc `drug_symptoms`, nên có bước normalize schema, deduplicate theo hoạt chất/tên thương mại và review thủ công các record nhạy cảm.
- `backend` hiện dùng contract nội bộ `POST /ai/recommend` cho luồng gợi ý thuốc.
- Source Python mới trong `ai-service/` hiện đang cung cấp chatbot endpoint `POST /ai/chat` để thử nghiệm fallback giữa nhiều LLM provider.
- Vì vậy, thư mục `ai-service/` hiện **chưa tự động thay thế** engine recommendation mà backend đang dùng. Muốn tích hợp đầy đủ cần thêm lớp mapping/adapter giữa `backend/src/services/ai/HttpAiServiceEngine.js` và API thực tế của FastAPI.
- Test trong `ai-service/tests/test_chatbot.py` là mock/integration nhẹ và chạy được trong suite mặc định khi đã cài `pytest-asyncio`.
- File `ai-service/tests/test_real_chatbot.py` là **live test**, mặc định bị skip để tránh phụ thuộc network/API key. Chỉ chạy khi chủ động bật:

```bash
cd ai-service
RUN_LIVE_AI_TESTS=1 pytest -q
```

### AI Phase 2026-06-22

- Recommendation runtime hiện đi theo hướng `specialty -> disease -> symptom -> drug`, backend vẫn giữ quyền quyết định cuối cùng.
- `ai-service` hiện có 2 vai trò:
  - `POST /ai/recommend` cho recommendation engine nội bộ.
  - `POST /ai/recommend/explain` cho lớp LLM explanation có grounding.
- LLM chỉ dùng để diễn giải kết quả đã được backend lọc theo dị ứng, chống chỉ định và danger alert; không được tự thêm thuốc hoặc bệnh mới.
- Chain provider hiện tại: `Gemini -> Groq -> Zhipu -> deterministic fallback`.
- Frontend đã hiển thị block giải thích grounded/fallback ngay trên trang gợi ý thuốc, kể cả khi không còn thuốc an toàn sau bước lọc.
- Tài liệu phase AI chi tiết xem thêm tại `docs/README.md`.

---

## 📅 Timeline 4 Sprint

| Sprint | Thời gian | Module | Mốc kiểm tra |
|---|---|---|---|
| **Sprint 1** | 11–18/5 | Kick-off · Setup · Thiết kế | ERD approved · API contract ký · Figma xong |
| **Sprint 2** | 19–25/5 | Nhập triệu chứng + Gợi ý thuốc | End-to-end chạy được trên staging |
| **Sprint 3** | 26/5–1/6 | Tiền sử bệnh + Dị ứng | AI v2 tích hợp history · test coverage ≥ 80% |
| **Sprint 4** | 2–10/6 | Stabilize · Deploy · Fix | Production ổn định · Tất cả output đủ |

**Nguyên tắc làm việc theo Sprint:**
- Cả nhóm cùng làm **1 module** trong 1 Sprint — không ai chạy một mình
- Mỗi sáng thứ Hai: từng người gửi **cam kết 3 dòng** vào group:
  1. Tuần này tôi làm gì
  2. Output đầu ra là gì (file / link / endpoint cụ thể)
  3. "Xong" trông như thế nào
- Mỗi cuối tuần: HA kiểm tra trực tiếp (xem code + chạy thử staging)

---

## 🌿 Git Workflow

```
main                  → Production-ready. Chỉ merge khi release.
dev                   → Integration branch. Mọi feature merge vào đây trước.
feature/nguyen-ai     → Nguyên làm trên này
feature/khoa-frontend → Khoa làm trên này
feature/ha-backend    → HA làm trên này
feature/tin-database  → Tín làm trên này
feature/tien-testing  → Tiến làm trên này
```

**Quy tắc commit:**
```
feat:     thêm tính năng mới
fix:      sửa bug
chore:    việc không liên quan code (config, package...)
docs:     cập nhật tài liệu
test:     thêm test case
refactor: sửa code không thêm feature, không fix bug
```

**Ví dụ:**
```
feat: add POST /symptoms/check endpoint
fix: filter allergy drugs from recommendation result
docs: update api-memory.md with /history endpoints
```

**Quy tắc merge:**
- Không được merge thẳng vào `main`
- Merge vào `dev` → HA review → merge vào `main`
- Tín deploy sau khi `main` được cập nhật

---

## 📋 MVP Scope — Làm gì, không làm gì

| Tính năng | Ưu tiên | Trạng thái |
|---|---|---|
| Đăng ký / Đăng nhập (JWT) | P0 | ✅ Làm — Sprint 2 |
| Nhập triệu chứng → Gợi ý thuốc (rule-based AI) | P0 | ✅ Làm — Sprint 2 |
| Lưu tiền sử bệnh (CRUD) | P0 | ✅ Làm — Sprint 3 |
| Ghi nhận dị ứng + lọc khỏi kết quả | P0 | ✅ Làm — Sprint 3 |
| Deploy production có link public | P0 | ✅ Làm — Sprint 4 |
| ML model thay rule-based | P1 | ⏳ Nếu còn thời gian |
| Nhập chỉ số sinh học (BMI, huyết áp) | P2 | ⏳ Nếu còn thời gian |
| Mobile app (React Native) | — | ❌ Không làm |
| Freemium / Thanh toán | — | ❌ Không làm |

---

## ⚠️ Nguyên tắc không được vi phạm

1. **ERD phải được HA approve trước khi ai bắt đầu code** — Tín gửi trước 18/5
2. **API contract BE↔AI phải được lưu file trước Tuần 2** — không chỉ nói miệng
3. **Không chia task theo user role** (Khoa và Tiến từng làm vậy) — chia theo module
4. **Tuần 4 không thêm tính năng mới** — chỉ fix, hoàn thiện, deploy
5. **Block quá 4 tiếng → hỏi ngay** — không để tắc cả ngày
6. **Test song song với code** — Tiến không đợi đến cuối mới test
7. **File test case nộp trước chiều thứ Sáu** để HA review cuối tuần

---

## 📁 Cấu trúc thư mục

```
medassist-ai/
├── frontend/                  → Khoa
│   └── src/
│       ├── components/        (common, auth, symptoms, history, allergy)
│       ├── pages/
│       ├── hooks/
│       ├── services/          (api.js — axios base config)
│       └── utils/
│
├── backend/                   → HA
│   ├── src/
│   │   ├── routes/            (Tầng 1 — khai báo đường dẫn)
│   │   ├── controllers/       (Tầng 2 — nhận req, trả res)
│   │   ├── services/          (Tầng 3 — business logic)
│   │   ├── repositories/      (Tầng 4 — SQL query)
│   │   ├── models/            (Class định nghĩa shape dữ liệu)
│   │   ├── middlewares/       (auth, validate, rateLimit, errorHandler)
│   │   ├── config/            (db.js, redis.js)
│   │   └── utils/             (ApiResponse, AppError, logger)
│   └── memory/
│       ├── db-memory.md       (Schema, ERD, quan hệ bảng)
│       ├── api-memory.md      (Endpoints, request/response format)
│       └── system-memory.md   (Kiến trúc, luồng dữ liệu, quy tắc)
│
├── ai-service/                → Nguyên
│   ├── routers/
│   ├── services/              (rule_engine.py)
│   ├── models/                (Pydantic models)
│   └── data/
│
└── docs/                      → Cả nhóm
    ├── database/              (schema.sql, ERD)
    ├── api-contracts/         (be-ai-contract.md, Postman)
    ├── user-stories/          (backlog.md)
    ├── testing/               (test-case-template.md)
    └── decisions/             (tech-decisions.md)
```

---

## 🚀 Quick Start

```bash
# Clone repo
git clone <repo-url>
cd medassist-ai

# Frontend (Khoa)
cd frontend
npm install
cp .env.example .env.local
npm run dev                    # http://localhost:3000

# Backend (HA)
cd backend
npm install
cp .env.example .env
npm run dev                    # http://localhost:5000

# AI Service (Nguyên)
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload      # http://localhost:8000

# Health check
curl http://localhost:5000/health
curl http://localhost:8000/health
```

---

## 📞 Khi nào cần hỏi ai?

| Vấn đề | Hỏi ai |
|---|---|
| Không hiểu User Story / scope tính năng | Nguyên |
| UI/UX không rõ, Figma chưa có | Khoa |
| API endpoint chưa có, BE bị lỗi | HA |
| DB schema sai, deploy có vấn đề | Tín |
| Bug chưa có test case cover | Tiến |
| Quyết định cắt scope / đổi kỹ thuật | **HA (Leader)** |

---

*Cập nhật lần cuối: 11/5/2026 · Người maintain: HA*
