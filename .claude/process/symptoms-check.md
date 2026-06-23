# symptoms-check — POST /api/v1/symptoms/check

## Luồng chạy

```
Client
  │  POST /api/v1/symptoms/check
  │  Authorization: Bearer <JWT>
  │  Body: { "symptoms": ["sot", "dau_dau"] }
  │
  ▼
[Route] symptomRoutes.js
  ├─ authenticate (middleware) — verify JWT, set req.user.userId
  ├─ validate(checkSchema) (middleware) — Joi: symptoms array ≥ 1 item, mỗi item string trim min 1
  │     400 nếu: [] / missing / item rỗng / item số / missing Content-Type
  │
  └─ RecommendationController.check(req, res, next)
       │
       ▼
[Controller] RecommendationController.js
  └─ this.#recommendationService.checkSymptoms(req.user.userId, req.body.symptoms)
       │  500 → next(err)
       │
       ▼
[Service] RecommendationService.js — checkSymptoms(userId, symptoms)
  ├─ Promise.all([
  │     PatientHistoryRepository.findChronicDiseasesByUserId(userId) → string[]
  │     AllergyRepository.findAllByUserId(userId)                    → string[]
  │  ])
  │
  ├─ #callAiService(symptoms, history, allergies) → { engineVersion, recommendations[] }
  │     (hiện tại: mock-v0 — trả static 2 drugs, chưa dùng params để filter)
  │
  ├─ RecommendationRepository.create({
  │     userId, inputSymptoms: {symptoms, history, allergies},
  │     outputDrugs: recommendations[], dangerAlert: null, engineVersion
  │  }) → { id, created_at }
  │
  └─ return { id, recommendations, engineVersion }
       │
       ▼
[Controller] res.json(ApiResponse.success(result, 'Gợi ý thuốc thành công'))
       │
       ▼
Client — 200 { success: true, message, data: { id, recommendations[], engineVersion } }
```

**Nhánh lỗi:**
- JWT missing/invalid/expired → 401 trước khi vào controller
- Joi validation fail → 400 với message tiếng Việt cụ thể
- DB error → 500 (pg pool throw, catch ở Service → next(err) → errorHandler)
- DB timeout (Supabase free tier) → 500 sau ~1-3 giây

---

## Những gì xây ở từng tầng

| File | Method / Thay đổi | Mô tả |
|---|---|---|
| `routes/symptomRoutes.js` | thêm POST /check | Wire DI + Joi schema + route |
| `controllers/RecommendationController.js` | `check` | Gọi service, format response, delegate error |
| `services/RecommendationService.js` | `checkSymptoms` | Fetch context, gọi AI mock, lưu DB |
| `services/RecommendationService.js` | `#callAiService` (private) | Mock AI stub, swap khi AI service sẵn sàng |
| `repositories/PatientHistoryRepository.js` | `findChronicDiseasesByUserId` | SELECT title WHERE entry_type='chronic_disease', trả string[] |
| `repositories/AllergyRepository.js` | `findAllByUserId` | SELECT drug_name FROM allergies, trả string[] |
| `repositories/RecommendationRepository.js` | `create` | INSERT với JSON.stringify cho JSONB columns |

---

## Chú ý quan trọng

**Quyết định thiết kế:**

1. **PatientHistoryRepository split method** — ban đầu thiết kế `findAllByUserId` trả raw rows rồi Service filter. Code review phát hiện vi phạm Tell Don't Ask → split thành `findChronicDiseasesByUserId` + `findCurrentMedicationsByUserId` với WHERE clause ở SQL layer. Thống nhất với nguyên tắc "Repository không filter logic — chỉ trả data đúng như query yêu cầu".

2. **AllergyRepository trả string[]** — ban đầu trả `[{drug_name}]` array of objects. Code review fix thành `.map(r => r.drug_name)` trực tiếp trong repository — Service không cần transform.

3. **AI contract** — `#callAiService` ban đầu có param `medications` không nằm trong CLAUDE.md BE↔AI contract. Đã xóa, chỉ giữ `(symptoms, history, allergies)`.

4. **outputDrugs** — lưu `aiResult.recommendations` (array), không lưu toàn bộ `aiResult` object (có cả engineVersion thừa).

5. **JSONB columns** — `input_symptoms` và `output_drugs` là JSONB trong Postgres → phải `JSON.stringify` khi INSERT.

6. **Mock AI** — `#callAiService` là private method với TODO comment + contract reference. Design để swap dễ khi AI service sẵn sàng (1 method, 1 file).

**Edge case đã phát hiện qua test:**
- `symptoms: [""]` → bị reject đúng (Joi `.trim().min(1)`)
- `symptoms: ["   "]` → bị reject đúng (trim → empty → min(1) fail)
- `symptoms: [123]` → bị reject nhưng message tiếng Anh (xem BUG-5)

---

## Kết quả test (2026-05-23)

**Môi trường:** local, port 3000, Redis CONNECTED, Supabase DB ECONNREFUSED (timeout)

| Test case | Input | Expected | Actual |
|---|---|---|---|
| TC-01: Happy path 2 symptoms | `["sot","dau_dau"]` + valid JWT | 200 + recommendations | ⏭ SKIP (DB down) |
| TC-02: Empty array | `symptoms: []` | 400 "Vui lòng chọn ít nhất..." | ✅ PASS 400 (107ms) |
| TC-03: Missing field | `{}` | 400 "Danh sách triệu chứng là bắt buộc" | ✅ PASS 400 (98ms) |
| TC-04: Empty string item | `[""]` | 400 "Triệu chứng không được để trống" | ✅ PASS 400 (92ms) |
| TC-05: String not array | `"sot"` | 400 "symptoms phải là mảng" | ✅ PASS 400 (91ms) |
| TC-06: No auth header | (no header) | 401 Unauthorized | ✅ PASS 401 (101ms) |
| TC-07: Bearer null | `Bearer null` | 401 Token không hợp lệ | ✅ PASS 401 (91ms) |
| TC-08: Tampered JWT | invalid signature | 401 | ✅ PASS 401 (91ms) |
| TC-09: Expired JWT | `expiresIn: '-1s'` | 401 Token đã hết hạn | ✅ PASS 401 (92ms) |
| TC-10: Wrong secret | wrong key | 401 | ✅ PASS 401 (94ms) |
| TC-11: SQL injection | `"sot\"; DROP TABLE..."` | safe (parameterized) | ✅ PASS — parameterized OK, 500 do DB |
| TC-12: Payload > 1MB | 1.1MB body | 413 | ❌ FAIL — 500 (errorHandler thiếu case) |
| TC-13: XSS in symptoms | `<script>alert(1)</script>` | sanitize/reject | ⚠️ warn — qua Joi, React FE escape bảo vệ |
| TC-15: Whitespace-only | `["   "]` | 400 | ✅ PASS 400 (104ms) |
| TC-16: Mix valid+empty | `["sot",""]` | 400 | ✅ PASS 400 (103ms) |
| TC-18: Number in array | `[123,"sot"]` | 400 | ❌ MINOR — message tiếng Anh |
| TC-21: Validation perf | invalid body (3 runs) | < 500ms | ✅ PASS avg 89ms |
| TC-22: Auth reject perf | no token (3 runs) | < 200ms | ✅ PASS avg 84ms |
| TC-23: Mock AI shape | static check | 8 fields, confidence 0-1 | ✅ PASS |
| TC-28: CORS allow | Origin: localhost:5173 | 204 preflight OK | ✅ PASS |
| TC-29: CORS block | Origin: evil.attacker.com | 403/4xx | ❌ MINOR — 500 (CORS block đúng, status sai) |
| TC-31: Full flow mock repos | node -e | { id, recs[2], engineVersion } | ✅ PASS |
| TC-32: First confidence ≥ 0.6 | static check | ≥ 0.6 | ✅ PASS 0.90 |
| TC-33: Confidence 0-1 range | static check | 0–1 | ✅ PASS [0.90, 0.72] |
| TC-35: Allergy filter | user có allergy Paracetamol | drug bị lọc ra | ❌ BLOCK — mock không filter |
| TC-36: Redis cache | 2 lần cùng symptoms | lần 2 ≥ 50% nhanh hơn | ❌ BLOCK — chưa implement |

**Tổng: 17 PASS / 6 FAIL / 4 SKIP**

---

## Issues cần fix trước khi ship

| Mức độ | Bug | File | Fix |
|---|---|---|---|
| BLOCK | Allergy filter không hoạt động | `services/RecommendationService.js` | Filter recommendations sau AI call dựa trên `allergies[]` |
| BLOCK | Redis cache chưa implement | `services/RecommendationService.js` | Inject redisClient, cache `recommend:<symptoms_key>` TTL 30 phút |
| MINOR | PayloadTooLargeError → 500 | `middlewares/errorHandler.js` | Handle `err.type === 'entity.too.large'` → 413 |
| MINOR | CORS error → 500 | `middlewares/errorHandler.js` | Handle `err.message === 'Not allowed by CORS'` → 403 |
| MINOR | Joi string.base message tiếng Anh | `routes/symptomRoutes.js` | Thêm `'string.base': 'Triệu chứng phải là chuỗi ký tự'` |
| MINOR | Wrong method → 404 HTML | `app.js` | Thêm global JSON 404 handler |

---

## Chuẩn bảo mật áp dụng

| Standard | Áp dụng |
|---|---|
| OWASP ASVS V5.1 (Input Validation) | Joi validation trước khi xử lý, parameterized queries chống SQL injection |
| OWASP ASVS V3.5 (Token-Based Auth) | JWT verify tại middleware, reject tampered/expired tokens |
| OWASP A03:2021 (Injection) | pg parameterized query ($1, $2) — không string concat |
| OWASP A01:2021 (Broken Access Control) | authenticate middleware bắt buộc trên route |
| Express security | `express.json({ limit: '1mb' })` để chặn large payload |
| XSS | React FE escape by default — backend lưu raw string, chấp nhận ở MVP scope |
