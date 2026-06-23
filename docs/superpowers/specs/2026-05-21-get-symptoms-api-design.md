# Design: GET /api/v1/symptoms

**Date:** 2026-05-21  
**Branch:** CHCKNSPC-49  
**Author:** HA

---

## Mục tiêu

Cung cấp endpoint để Frontend lấy danh sách triệu chứng hiển thị cho user chọn trước khi gửi lên AI service.

---

## Thông tin DB

Bảng `symptoms` trên Supabase:

| Field | Type | Mô tả |
|---|---|---|
| `id` | uuid | Primary key |
| `code` | varchar | Slug snake_case không dấu: `sot`, `dau_dau` |
| `name` | varchar | Tên hiển thị tiếng Việt: `Sốt`, `Đau đầu` |
| `icd10_code` | varchar | Mã ICD-10 (không trả về FE) |
| `description` | text | Mô tả (không trả về FE) |
| `created_at` | timestamp | (không trả về FE) |

---

## API Contract

```
GET /api/v1/symptoms
Authorization: Bearer <accessToken>
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "code": "dau_dau", "name": "Đau đầu" },
    { "id": "uuid", "code": "ho",      "name": "Ho"      },
    { "id": "uuid", "code": "sot",     "name": "Sốt"     }
  ]
}
```

**Response 401** (thiếu / sai / hết hạn token):
```json
{ "success": false, "message": "Unauthorized", "code": "UNAUTHORIZED" }
```

**Response 500** (DB lỗi):
```json
{ "success": false, "message": "Internal Server Error" }
```

---

## Architecture

### Files tạo mới

```
backend/src/
├── middlewares/
│   └── auth.js                 ← JWT authenticate middleware (dùng lại cho route sau)
├── repositories/
│   └── SymptomRepository.js
├── services/
│   └── SymptomService.js
├── controllers/
│   └── SymptomController.js
└── routes/
    └── symptomRoutes.js
```

### Files sửa

```
backend/src/app.js  ← mount app.use('/api/v1/symptoms', symptomRoutes)
```

---

## Data Flow

```
GET /api/v1/symptoms
Authorization: Bearer <accessToken>
        │
        ▼
[Middleware] authenticate
  - Lấy token từ Authorization: Bearer <token>
  - jwt.verify(token, JWT_SECRET)
    → Sai / thiếu / hết hạn → 401 UNAUTHORIZED
  - Gắn req.user = { userId, role } → next()
        │
        ▼
[Controller] SymptomController.getAll
  - Gọi symptomService.getSymptomsForSelection()
  - res.json(ApiResponse.success(result))
        │
        ▼
[Service] SymptomService.getSymptomsForSelection()
  - try redis.get('symptoms:all')
    → Cache hit  → JSON.parse → return
    → Cache miss / Redis down → tiếp tục
  - symptomRepo.findAll()
  - try redis.setEx('symptoms:all', 3600, JSON.stringify(rows))
    → Redis vẫn down → bỏ qua (graceful degradation)
  - return rows
        │
        ▼
[Repository] SymptomRepository.findAll()
  SELECT id, code, name FROM symptoms ORDER BY name ASC
```

---

## Error Handling

| Tình huống | Xử lý | HTTP |
|---|---|---|
| Thiếu / sai JWT | `authenticate` middleware throw AppError | 401 |
| Redis down | Graceful fallback → query DB, user không bị ảnh hưởng | 200 |
| DB lỗi | Bubble up → global `errorHandler` | 500 |
| DB trả rỗng | Trả `[]` bình thường | 200 |

### Redis recovery

Cache tự rebuild lần đầu tiên sau khi Redis khôi phục — không cần restart app hay can thiệp thủ công.

---

## OOP Checklist

| Tiêu chí | SymptomRepository | SymptomService | SymptomController |
|---|---|---|---|
| Encapsulation | `#pool` private | `#symptomRepo`, `#redis` private | `#symptomService` private |
| Abstraction | Tầng trên không biết SQL | Không biết req/res, không biết SQL | Không biết business logic |
| SRP | Đổi khi schema DB đổi | Đổi khi cache rule đổi | Đổi khi HTTP contract đổi |
| DI | `constructor(pool)` | `constructor(repo, redis)` | `constructor(service)` |

---

## Redis Cache

| Key | TTL | Lý do |
|---|---|---|
| `symptoms:all` | 3600s (1 giờ) | Danh sách symptoms ít thay đổi, pattern nhất quán với `drug:${id}` trong CLAUDE.md |

---

## auth.js — Tái dụng cho route sau

Middleware `authenticate` được thiết kế để tái dụng cho tất cả protected routes sau:
- `POST /api/v1/symptoms/check`
- `GET/POST /api/v1/patient-history`
- `GET/POST /api/v1/allergies`
- `GET /api/v1/recommendations`
