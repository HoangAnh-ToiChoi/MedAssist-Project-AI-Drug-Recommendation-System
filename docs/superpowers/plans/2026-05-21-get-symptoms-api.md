# GET /api/v1/symptoms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng endpoint `GET /api/v1/symptoms` trả danh sách triệu chứng (id, code, name) cho FE chọn, protected bằng JWT, có Redis cache TTL 1 giờ.

**Architecture:** 4-layer Route → Controller → Service → Repository. auth.js middleware tái dụng cho mọi protected route sau này. SymptomService thực hiện graceful degradation khi Redis down — fallback query DB, không trả lỗi cho user.

**Tech Stack:** Node.js, Express.js, jsonwebtoken, redis v4, pg, Joi (không dùng), ApiResponse/AppError utils đã có.

---

## File Map

| Action | Path | Trách nhiệm |
|---|---|---|
| Create | `backend/src/middlewares/auth.js` | Verify JWT, gắn req.user |
| Create | `backend/src/repositories/SymptomRepository.js` | SELECT id, code, name FROM symptoms |
| Create | `backend/src/services/SymptomService.js` | Redis cache + fallback DB |
| Create | `backend/src/controllers/SymptomController.js` | Nhận req, gọi Service, format res |
| Create | `backend/src/routes/symptomRoutes.js` | DI + khai báo route |
| Modify | `backend/src/app.js` | Mount /api/v1/symptoms |

---

## Task 1: auth.js Middleware

**Files:**
- Create: `backend/src/middlewares/auth.js`

- [ ] **Step 1: Tạo file auth.js**

```javascript
// backend/src/middlewares/auth.js
const jwt = require('jsonwebtoken')
const AppError = require('../utils/AppError')

const authenticate = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'))
  }

  const token = header.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = { userId: payload.userId, role: payload.role }
    next()
  } catch (err) {
    next(err)
  }
}

module.exports = authenticate
```

> **Lưu ý:** `catch (err) → next(err)` để errorHandler xử lý `JsonWebTokenError` (→ 401 INVALID_TOKEN) và `TokenExpiredError` (→ 401 TOKEN_EXPIRED). Chỉ case không có header mới throw AppError UNAUTHORIZED thủ công.

- [ ] **Step 2: Commit**

```bash
git add backend/src/middlewares/auth.js
git commit -m "feat: add JWT authenticate middleware"
```

---

## Task 2: SymptomRepository

**Files:**
- Create: `backend/src/repositories/SymptomRepository.js`

- [ ] **Step 1: Tạo SymptomRepository**

```javascript
// backend/src/repositories/SymptomRepository.js
const { Pool } = require('pg')

class SymptomRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async findAll() {
    const { rows } = await this.#pool.query(
      'SELECT id, code, name FROM symptoms ORDER BY name ASC'
    )
    return rows
  }
}

module.exports = SymptomRepository
```

> **Lưu ý:** SELECT đúng 3 field (id, code, name) — không SELECT *. ORDER BY name ASC để FE hiển thị danh sách đã sort. Trả `rows` trực tiếp — không wrap thêm class (không dùng Model layer theo CLAUDE.md).

- [ ] **Step 2: Commit**

```bash
git add backend/src/repositories/SymptomRepository.js
git commit -m "feat: add SymptomRepository with findAll"
```

---

## Task 3: SymptomService

**Files:**
- Create: `backend/src/services/SymptomService.js`

- [ ] **Step 1: Tạo SymptomService**

```javascript
// backend/src/services/SymptomService.js
class SymptomService {
  #symptomRepo
  #redis

  constructor(symptomRepository, redisClient) {
    this.#symptomRepo = symptomRepository
    this.#redis = redisClient
  }

  async getSymptomsForSelection() {
    try {
      const cached = await this.#redis.get('symptoms:all')
      if (cached) return JSON.parse(cached)
    } catch {
      // Redis down — tiếp tục query DB
    }

    const rows = await this.#symptomRepo.findAll()

    try {
      await this.#redis.setEx('symptoms:all', 3600, JSON.stringify(rows))
    } catch {
      // Redis vẫn down — bỏ qua, không ảnh hưởng response
    }

    return rows
  }
}

module.exports = SymptomService
```

> **Lưu ý:** TTL 3600 giây (1 giờ). Cache key `symptoms:all`. Hai try/catch độc lập — lỗi get cache và lỗi set cache đều không throw, user vẫn nhận data từ DB.

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/SymptomService.js
git commit -m "feat: add SymptomService with Redis cache and DB fallback"
```

---

## Task 4: SymptomController

**Files:**
- Create: `backend/src/controllers/SymptomController.js`

- [ ] **Step 1: Tạo SymptomController**

```javascript
// backend/src/controllers/SymptomController.js
const ApiResponse = require('../utils/ApiResponse')

class SymptomController {
  #symptomService

  constructor(symptomService) {
    this.#symptomService = symptomService
  }

  getAll = async (req, res, next) => {
    try {
      const result = await this.#symptomService.getSymptomsForSelection()
      res.json(ApiResponse.success(result))
    } catch (err) {
      next(err)
    }
  }
}

module.exports = SymptomController
```

> **Lưu ý:** `getAll` dùng arrow function để `this` binding đúng khi truyền vào router. Controller không biết SQL tồn tại, không check business condition — chỉ trigger Service và format response.

- [ ] **Step 2: Commit**

```bash
git add backend/src/controllers/SymptomController.js
git commit -m "feat: add SymptomController"
```

---

## Task 5: symptomRoutes + Wire vào app.js

**Files:**
- Create: `backend/src/routes/symptomRoutes.js`
- Modify: `backend/src/app.js`

- [ ] **Step 1: Tạo symptomRoutes.js**

```javascript
// backend/src/routes/symptomRoutes.js
const { Router } = require('express')
const authenticate = require('../middlewares/auth')
const SymptomController = require('../controllers/SymptomController')
const SymptomService = require('../services/SymptomService')
const SymptomRepository = require('../repositories/SymptomRepository')
const pool = require('../config/db')
const redisClient = require('../config/redis')

const router = Router()

// Dependency Injection
const symptomRepo       = new SymptomRepository(pool)
const symptomService    = new SymptomService(symptomRepo, redisClient)
const symptomController = new SymptomController(symptomService)

router.get('/', authenticate, symptomController.getAll)

module.exports = router
```

- [ ] **Step 2: Sửa app.js — thêm 2 dòng**

Mở `backend/src/app.js`. File hiện tại:

```javascript
const express = require('express')
const cors = require('cors')
const errorHandler = require('./middlewares/errorHandler')
const authRoutes = require('./routes/authRoutes')

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/v1/auth', authRoutes)

app.use(errorHandler)

module.exports = app
```

Sửa thành:

```javascript
const express = require('express')
const cors = require('cors')
const errorHandler = require('./middlewares/errorHandler')
const authRoutes = require('./routes/authRoutes')
const symptomRoutes = require('./routes/symptomRoutes')

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/symptoms', symptomRoutes)

app.use(errorHandler)

module.exports = app
```

> Thêm đúng 2 dòng: `require` ở trên và `app.use` ở dưới — không thay đổi gì khác.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/symptomRoutes.js backend/src/app.js
git commit -m "feat: register GET /api/v1/symptoms route with DI"
```

---

## Task 6: Kiểm thử end-to-end

**Chuẩn bị:** Backend đang chạy (`npm run dev`), Redis đang chạy, DB Supabase có data trong bảng `symptoms`.

### Test 1 — Thiếu token → 401

```bash
curl -X GET http://localhost:3000/api/v1/symptoms
```

**Expected:**
```json
{ "success": false, "message": "Unauthorized", "code": "UNAUTHORIZED" }
```

---

### Test 2 — Token sai → 401 INVALID_TOKEN

```bash
curl -X GET http://localhost:3000/api/v1/symptoms \
  -H "Authorization: Bearer tokenrác"
```

**Expected:**
```json
{ "success": false, "message": "Token không hợp lệ", "code": "INVALID_TOKEN" }
```

---

### Test 3 — Lấy accessToken hợp lệ (login trước)

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

Copy `accessToken` từ response.

---

### Test 4 — Token hợp lệ → 200 + danh sách symptoms

```bash
curl -X GET http://localhost:3000/api/v1/symptoms \
  -H "Authorization: Bearer <accessToken>"
```

**Expected:**
```json
{
  "success": true,
  "message": "Thành công",
  "data": [
    { "id": "...", "code": "dau_dau", "name": "Đau đầu" },
    { "id": "...", "code": "ho",      "name": "Ho"      },
    { "id": "...", "code": "sot",     "name": "Sốt"     }
  ]
}
```

> Data sort theo `name ASC`. Nếu bảng symptoms chưa có data → `"data": []` — đây là đúng, không phải lỗi.

---

### Test 5 — Verify Redis cache

Gọi Test 4 lần 2. Mở Redis CLI:

```bash
redis-cli GET symptoms:all
```

**Expected:** JSON string của danh sách symptoms — xác nhận cache đã được set.

---

### Test 6 — Postman (optional, ghi lại cho Tiến)

Import request vào collection `MedAssist_Auth_Refresh_Logout`:

```
GET {{base_url}}/api/v1/symptoms
Authorization: Bearer {{access_token}}
```

Test script:
```javascript
pm.test("Status 200", () => pm.response.to.have.status(200))
pm.test("success true", () => pm.expect(pm.response.json().success).to.be.true)
pm.test("data is array", () => pm.expect(pm.response.json().data).to.be.an('array'))
```

- [ ] **Step 1: Chạy tất cả test cases trên, xác nhận pass hết**

- [ ] **Step 2: Commit nếu có fix**

```bash
git add -p
git commit -m "fix: <mô tả lỗi nếu có>"
```
