# CHCKNSPC-54: API POST /symptoms/check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `POST /api/v1/symptoms/check` — nhận symptom codes từ FE, lấy context user từ DB, trả mock AI recommendations, lưu vào bảng `recommendations`.

**Architecture:** 4-layer pattern (Route → Controller → Service → Repository). Tạo `RecommendationService` riêng biệt (không đụng `SymptomService`). AI call được stub trong private method `#callAiService` để dễ swap sau.

**Tech Stack:** Node.js, Express, pg (PostgreSQL), Joi validation, JWT authenticate middleware

---

## File Structure

| File | Action | Mục đích |
|---|---|---|
| `backend/src/repositories/PatientHistoryRepository.js` | Create | Query bảng `patient_history` |
| `backend/src/repositories/AllergyRepository.js` | Create | Query bảng `allergies` |
| `backend/src/repositories/RecommendationRepository.js` | Create | INSERT vào bảng `recommendations` |
| `backend/src/services/RecommendationService.js` | Create | Business logic: fetch context, call AI, save |
| `backend/src/controllers/RecommendationController.js` | Create | HTTP layer: nhận req, format res |
| `backend/src/routes/symptomRoutes.js` | Modify | Thêm `POST /check` + wire dependencies |

---

## Task 1: PatientHistoryRepository

**Files:**
- Create: `backend/src/repositories/PatientHistoryRepository.js`

- [ ] **Step 1: Tạo file**

```javascript
// backend/src/repositories/PatientHistoryRepository.js
class PatientHistoryRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async findAllByUserId(userId) {
    const { rows } = await this.#pool.query(
      'SELECT entry_type, title FROM patient_history WHERE user_id = $1',
      [userId]
    )
    return rows
  }
}

module.exports = PatientHistoryRepository
```

- [ ] **Step 2: Verify syntax — chạy node quick-check**

```bash
cd backend
node -e "const R = require('./src/repositories/PatientHistoryRepository'); console.log('OK:', typeof R)"
```

Expected output: `OK: function`

- [ ] **Step 3: Commit**

```bash
git add backend/src/repositories/PatientHistoryRepository.js
git commit -m "feat: add PatientHistoryRepository for CHCKNSPC-54"
```

---

## Task 2: AllergyRepository

**Files:**
- Create: `backend/src/repositories/AllergyRepository.js`

- [ ] **Step 1: Tạo file**

```javascript
// backend/src/repositories/AllergyRepository.js
class AllergyRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async findAllByUserId(userId) {
    const { rows } = await this.#pool.query(
      'SELECT drug_name FROM allergies WHERE user_id = $1',
      [userId]
    )
    return rows
  }
}

module.exports = AllergyRepository
```

- [ ] **Step 2: Verify syntax**

```bash
node -e "const R = require('./src/repositories/AllergyRepository'); console.log('OK:', typeof R)"
```

Expected output: `OK: function`

- [ ] **Step 3: Commit**

```bash
git add backend/src/repositories/AllergyRepository.js
git commit -m "feat: add AllergyRepository for CHCKNSPC-54"
```

---

## Task 3: RecommendationRepository

**Files:**
- Create: `backend/src/repositories/RecommendationRepository.js`

- [ ] **Step 1: Tạo file**

```javascript
// backend/src/repositories/RecommendationRepository.js
class RecommendationRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async create({ userId, inputSymptoms, outputDrugs, dangerAlert, engineVersion }) {
    const { rows } = await this.#pool.query(
      `INSERT INTO recommendations (user_id, input_symptoms, output_drugs, danger_alert, engine_version)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [userId, JSON.stringify(inputSymptoms), JSON.stringify(outputDrugs), dangerAlert, engineVersion]
    )
    return rows[0]
  }
}

module.exports = RecommendationRepository
```

- [ ] **Step 2: Verify syntax**

```bash
node -e "const R = require('./src/repositories/RecommendationRepository'); console.log('OK:', typeof R)"
```

Expected output: `OK: function`

- [ ] **Step 3: Commit**

```bash
git add backend/src/repositories/RecommendationRepository.js
git commit -m "feat: add RecommendationRepository for CHCKNSPC-54"
```

---

## Task 4: RecommendationService

**Files:**
- Create: `backend/src/services/RecommendationService.js`

- [ ] **Step 1: Tạo file**

```javascript
// backend/src/services/RecommendationService.js
class RecommendationService {
  #patientHistoryRepo
  #allergyRepo
  #recommendationRepo

  constructor(patientHistoryRepo, allergyRepo, recommendationRepo) {
    this.#patientHistoryRepo = patientHistoryRepo
    this.#allergyRepo = allergyRepo
    this.#recommendationRepo = recommendationRepo
  }

  async checkSymptoms(userId, symptoms) {
    const historyRows = await this.#patientHistoryRepo.findAllByUserId(userId)
    const allergyRows = await this.#allergyRepo.findAllByUserId(userId)

    const history     = historyRows.filter(r => r.entry_type === 'chronic_disease').map(r => r.title)
    const medications = historyRows.filter(r => r.entry_type === 'current_medication').map(r => r.title)
    const allergies   = allergyRows.map(r => r.drug_name)

    const aiResult = await this.#callAiService(symptoms, history, medications, allergies)

    const saved = await this.#recommendationRepo.create({
      userId,
      inputSymptoms: { symptoms, history, medications, allergies },
      outputDrugs:   aiResult,
      dangerAlert:   null,
      engineVersion: aiResult.engineVersion,
    })

    return {
      id:              saved.id,
      recommendations: aiResult.recommendations,
      engineVersion:   aiResult.engineVersion,
    }
  }

  // TODO: swap body này khi AI service sẵn sàng
  async #callAiService(symptoms, history, medications, allergies) {
    return {
      engineVersion: 'mock-v0',
      recommendations: [
        {
          name:              'Paracetamol 500mg',
          generic_name:      'Paracetamol',
          confidence:        0.90,
          category:          'Giảm đau - Hạ sốt',
          reason:            'Phù hợp với triệu chứng sốt và đau đầu. Không có tương tác với thuốc đang dùng.',
          description:       'Thuốc giảm đau hạ sốt thông thường, an toàn cho hầu hết người dùng.',
          dosage:            '500mg - 1g mỗi 4-6 giờ, tối đa 4g/ngày',
          contraindications: 'Suy gan nặng, dị ứng Paracetamol',
        },
        {
          name:              'Ibuprofen 400mg',
          generic_name:      'Ibuprofen',
          confidence:        0.72,
          category:          'NSAIDs - Kháng viêm',
          reason:            'Có tác dụng hạ sốt và giảm đau đầu hiệu quả.',
          description:       'Thuốc kháng viêm không steroid, hạ sốt và giảm đau.',
          dosage:            '400mg mỗi 6-8 giờ sau ăn',
          contraindications: 'Loét dạ dày, suy thận nặng',
        },
      ],
    }
  }
}

module.exports = RecommendationService
```

- [ ] **Step 2: Verify syntax**

```bash
node -e "const S = require('./src/services/RecommendationService'); console.log('OK:', typeof S)"
```

Expected output: `OK: function`

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/RecommendationService.js
git commit -m "feat: add RecommendationService with mock AI stub for CHCKNSPC-54"
```

---

## Task 5: RecommendationController

**Files:**
- Create: `backend/src/controllers/RecommendationController.js`

- [ ] **Step 1: Tạo file**

```javascript
// backend/src/controllers/RecommendationController.js
const ApiResponse = require('../utils/ApiResponse')

class RecommendationController {
  #recommendationService

  constructor(recommendationService) {
    this.#recommendationService = recommendationService
  }

  check = async (req, res, next) => {
    try {
      const result = await this.#recommendationService.checkSymptoms(
        req.user.userId,
        req.body.symptoms,
      )
      res.json(ApiResponse.success(result, 'Gợi ý thuốc thành công'))
    } catch (err) {
      next(err)
    }
  }
}

module.exports = RecommendationController
```

- [ ] **Step 2: Verify syntax**

```bash
node -e "const C = require('./src/controllers/RecommendationController'); console.log('OK:', typeof C)"
```

Expected output: `OK: function`

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/RecommendationController.js
git commit -m "feat: add RecommendationController for CHCKNSPC-54"
```

---

## Task 6: Wire Route

**Files:**
- Modify: `backend/src/routes/symptomRoutes.js`

- [ ] **Step 1: Mở file hiện tại**

File hiện tại (`backend/src/routes/symptomRoutes.js`) có nội dung:

```javascript
const { Router } = require('express')
const authenticate = require('../middlewares/auth')
const SymptomController = require('../controllers/SymptomController')
const SymptomService = require('../services/SymptomService')
const SymptomRepository = require('../repositories/SymptomRepository')
const pool = require('../config/db')
const redisClient = require('../config/redis')

const router = Router()

const symptomRepo       = new SymptomRepository(pool)
const symptomService    = new SymptomService(symptomRepo, redisClient)
const symptomController = new SymptomController(symptomService)

router.get('/', authenticate, symptomController.getAll)

module.exports = router
```

- [ ] **Step 2: Thay thế toàn bộ nội dung file bằng version mới**

```javascript
const { Router } = require('express')
const Joi = require('joi')
const authenticate = require('../middlewares/auth')
const validate = require('../middlewares/validate')

const SymptomController = require('../controllers/SymptomController')
const SymptomService = require('../services/SymptomService')
const SymptomRepository = require('../repositories/SymptomRepository')

const RecommendationController = require('../controllers/RecommendationController')
const RecommendationService = require('../services/RecommendationService')
const PatientHistoryRepository = require('../repositories/PatientHistoryRepository')
const AllergyRepository = require('../repositories/AllergyRepository')
const RecommendationRepository = require('../repositories/RecommendationRepository')

const pool = require('../config/db')
const redisClient = require('../config/redis')

const router = Router()

// ── Symptom list DI ──────────────────────────────────────────────────────────
const symptomRepo       = new SymptomRepository(pool)
const symptomService    = new SymptomService(symptomRepo, redisClient)
const symptomController = new SymptomController(symptomService)

// ── Recommendation DI ────────────────────────────────────────────────────────
const patientHistoryRepo       = new PatientHistoryRepository(pool)
const allergyRepo              = new AllergyRepository(pool)
const recommendationRepo       = new RecommendationRepository(pool)
const recommendationService    = new RecommendationService(patientHistoryRepo, allergyRepo, recommendationRepo)
const recommendationController = new RecommendationController(recommendationService)

// ── Validation schema ────────────────────────────────────────────────────────
const checkSchema = Joi.object({
  symptoms: Joi.array().items(Joi.string().trim()).min(1).required().messages({
    'array.min':    'Vui lòng chọn ít nhất một triệu chứng',
    'array.base':   'symptoms phải là mảng',
    'any.required': 'Danh sách triệu chứng là bắt buộc',
  }),
})

// ── Routes ───────────────────────────────────────────────────────────────────
router.get('/',      authenticate, symptomController.getAll)
router.post('/check', authenticate, validate(checkSchema), recommendationController.check)

module.exports = router
```

- [ ] **Step 3: Verify server khởi động không lỗi**

```bash
cd backend
npm run dev
```

Expected: server starts, không có `Error: Cannot find module` hay syntax error. Thấy log như `Server running on port 5000` là OK. Ctrl+C để tắt.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/symptomRoutes.js
git commit -m "feat: wire POST /symptoms/check route for CHCKNSPC-54"
```

---

## Task 7: Integration Test (Manual)

Server phải đang chạy (`npm run dev`). Cần có access token hợp lệ (đăng nhập trước).

- [ ] **Step 1: Lấy access token**

```bash
curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}' \
  | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.accessToken))"
```

Copy access token để dùng ở bước tiếp theo. Gán vào biến:
```bash
TOKEN=<paste_token_here>
```

- [ ] **Step 2: Test case happy path**

```bash
curl -s -X POST http://localhost:5000/api/v1/symptoms/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"symptoms":["sot","dau_dau"]}' | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)))"
```

Expected response:
```json
{
  "success": true,
  "message": "Gợi ý thuốc thành công",
  "data": {
    "id": "<uuid>",
    "recommendations": [
      {
        "name": "Paracetamol 500mg",
        "confidence": 0.90,
        ...
      },
      {
        "name": "Ibuprofen 400mg",
        "confidence": 0.72,
        ...
      }
    ],
    "engineVersion": "mock-v0"
  }
}
```

- [ ] **Step 3: Test case validation — symptoms rỗng**

```bash
curl -s -X POST http://localhost:5000/api/v1/symptoms/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"symptoms":[]}'
```

Expected:
```json
{
  "success": false,
  "message": "Vui lòng chọn ít nhất một triệu chứng",
  "code": "VALIDATION_ERROR"
}
```

- [ ] **Step 4: Test case validation — thiếu field symptoms**

```bash
curl -s -X POST http://localhost:5000/api/v1/symptoms/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}'
```

Expected:
```json
{
  "success": false,
  "message": "Danh sách triệu chứng là bắt buộc",
  "code": "VALIDATION_ERROR"
}
```

- [ ] **Step 5: Test case 401 — không có token**

```bash
curl -s -X POST http://localhost:5000/api/v1/symptoms/check \
  -H "Content-Type: application/json" \
  -d '{"symptoms":["sot"]}'
```

Expected: `401` response với message về unauthorized.

- [ ] **Step 6: Verify DB — record đã được lưu**

Sau khi happy path thành công, check DB (Supabase Dashboard hoặc psql):

```sql
SELECT id, user_id, engine_version, created_at
FROM recommendations
ORDER BY created_at DESC
LIMIT 1;
```

Expected: 1 row mới với `engine_version = 'mock-v0'`.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "CHCKNSPC-54 API POST /triệu chứng/kiểm tra (Node.js → gọi AI → trả FE)"
```

---

## Checklist hoàn thành

- [ ] `PatientHistoryRepository` — query patient_history
- [ ] `AllergyRepository` — query allergies
- [ ] `RecommendationRepository` — insert recommendations
- [ ] `RecommendationService` — business logic + mock AI stub
- [ ] `RecommendationController` — HTTP layer
- [ ] `symptomRoutes.js` — route `POST /check` wired
- [ ] Happy path test pass
- [ ] Validation test pass (empty array, missing field)
- [ ] 401 test pass
- [ ] DB record verified

---

## Ghi chú: Khi AI service sẵn sàng

Mở `backend/src/services/RecommendationService.js`, tìm method `#callAiService`, thay toàn bộ body bằng:

```javascript
async #callAiService(symptoms, history, medications, allergies) {
  const AppError = require('../utils/AppError')
  const response = await fetch(`${process.env.AI_SERVICE_URL}/ai/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symptoms, history, medications, allergies }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new AppError('AI service không khả dụng', 503)
  return response.json()
}
```

Thêm `AI_SERVICE_URL` vào `.env`. Update `engineVersion` mapping nếu AI trả về format khác mock.
