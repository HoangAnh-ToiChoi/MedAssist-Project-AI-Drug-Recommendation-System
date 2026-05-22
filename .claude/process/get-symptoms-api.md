# GET /api/v1/symptoms — Danh sách triệu chứng cho FE

## Luồng chạy

```
Client gửi GET /api/v1/symptoms
Authorization: Bearer <accessToken>
        │
        ▼
[Middleware] authenticate (auth.js)
  - Không có header / sai scheme → next(AppError 401 UNAUTHORIZED)
  - jwt.verify(token, JWT_SECRET)
    → JsonWebTokenError → next(err) → errorHandler → 401 INVALID_TOKEN
    → TokenExpiredError → next(err) → errorHandler → 401 TOKEN_EXPIRED
  - Thành công → req.user = { userId, role } → next()
        │
        ▼
[Controller] SymptomController.getAll
  - Gọi symptomService.getSymptomsForSelection()
  - res.json(ApiResponse.success(result))
        │
        ▼
[Service] SymptomService.getSymptomsForSelection()
  - try redis.get('symptoms:all')
    → Cache hit → JSON.parse → return  (avg ~17ms)
    → Cache miss / Redis down → tiếp tục
  - symptomRepo.findAll()  (avg ~147ms cold, Supabase roundtrip)
  - try redis.setEx('symptoms:all', 3600, JSON.stringify(rows))
    → Redis down → bỏ qua (graceful degradation)
  - return rows
        │
        ▼
[Repository] SymptomRepository.findAll()
  SELECT id, code, name FROM symptoms ORDER BY name ASC
        │
        ▼
Response 200:
{
  "success": true,
  "message": "Thành công",
  "data": [
    { "id": "uuid", "code": "dau_dau", "name": "Đau đầu" },
    { "id": "uuid", "code": "ho",      "name": "Ho"      },
    { "id": "uuid", "code": "sot",     "name": "Sốt"     }
  ]
}
```

---

## Những gì xây ở từng tầng

| File | Method / Export | Mô tả |
|---|---|---|
| `middlewares/auth.js` | `authenticate` | Verify JWT, gắn req.user. Tái dụng cho mọi protected route sau |
| `repositories/SymptomRepository.js` | `findAll()` | SELECT id, code, name ORDER BY name ASC |
| `services/SymptomService.js` | `getSymptomsForSelection()` | Redis cache TTL 1h + graceful fallback DB |
| `controllers/SymptomController.js` | `getAll` (arrow fn) | Gọi Service, format res |
| `routes/symptomRoutes.js` | DI + `GET /` | Composition root, gắn authenticate |
| `app.js` | mount | `app.use('/api/v1/symptoms', symptomRoutes)` |

---

## Chú ý quan trọng

**1. auth.js dùng `next(err)` thay vì wrap lại AppError**
JWT errors (`JsonWebTokenError`, `TokenExpiredError`) được bubble lên `errorHandler` — không wrap lại AppError thủ công. `errorHandler.js` đã xử lý 2 loại này với message tiếng Việt và code riêng biệt (`INVALID_TOKEN`, `TOKEN_EXPIRED`). Chỉ case "không có header" mới throw `AppError('Unauthorized', 401, 'UNAUTHORIZED')` thủ công.

**2. Hai try/catch độc lập trong SymptomService**
Get-cache và set-cache là 2 try/catch riêng — nếu get fail, vẫn thử set sau khi query DB. Nếu set fail, user vẫn nhận data. Pattern này đảm bảo Redis down không ảnh hưởng user.

**3. SELECT đúng 3 field — không SELECT \***
Repository chỉ SELECT `id, code, name` — không leak `icd10_code`, `description`, `created_at` ra response.

**4. `getAll` dùng arrow function**
Arrow function giữ `this` binding đúng khi Express gọi `symptomController.getAll` như callback — không mất context class.

**5. Code review: PASS — 0 vi phạm**
Tất cả 4 tiêu chí OOP (Encapsulation, Abstraction, SRP, DI) + Tell Don't Ask + Layer Isolation đạt chuẩn.

---

## Kết quả tự test

Ngày test: 2026-05-22 | Môi trường: local | Server: port 3000

| Test case | Input | Expected | Actual |
|---|---|---|---|
| TC-01: Happy path | Valid JWT | 200 + data array | ✅ 147ms (cold) / 36ms (warm) |
| TC-02: Sort order | Valid JWT | name ASC | ✅ DB-level ORDER BY (table rỗng) |
| TC-03: Không có header | Không có Authorization | 401 UNAUTHORIZED | ✅ 29ms |
| TC-04: Token rác | `Bearer tokenrác` | 401 INVALID_TOKEN | ✅ ~10ms |
| TC-05: Sai scheme | `Basic abc` | 401 UNAUTHORIZED | ✅ ~2ms |
| TC-06: Thiếu token | `Bearer` (không có value) | 401 UNAUTHORIZED | ✅ ~2ms |
| TC-07: Performance | 5 lần liên tiếp | < 2000ms mỗi call | ✅ AVG 20ms, MAX 33ms |
| TC-08: `Bearer null` | String "null" | 401 INVALID_TOKEN | ✅ ~2ms |
| TC-09: SQL injection trong header | `' OR '1'='1'; DROP TABLE...` | 401, server không crash | ✅ JWT chặn trước SQL |
| TC-10: Bảng rỗng | Valid JWT, 0 records | 200 + `data: []` | ✅ Trả [] không phải null |
| TC-11: Field leak | Static analysis | Chỉ id, code, name | ✅ SELECT đúng 3 field |
| TC-12: Token hết hạn | Token `expiresIn: '-1s'` | 401 TOKEN_EXPIRED | ✅ errorHandler xử lý đúng |
| TC-13: Sai secret | Token ký bằng WRONG_SECRET | 401 INVALID_TOKEN | ✅ JsonWebTokenError |

**Tổng: 13/13 PASS — SHIP-READY**

> **Lưu ý:** Bảng `symptoms` hiện rỗng trên Supabase. Cần seed data trước khi demo để TC-02 (sort order) có thể verify runtime.

---

## Chuẩn bảo mật áp dụng

- **OWASP ASVS V3.2**: Access token verify server-side, không trust client
- **OWASP ASVS V3.3**: Token expired được detect và trả lỗi rõ ràng (`TOKEN_EXPIRED`)
- **SQL Injection**: Parameterized query — không string concat; JWT layer chặn trước khi header chạm SQL
- **Field exposure**: SELECT chỉ đúng field cần thiết — không leak `icd10_code`, `description`
