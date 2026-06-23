# Design Spec — CHCKNSPC-54: API POST /symptoms/check

**Ngày:** 2026-05-23  
**Task:** CHCKNSPC-54  
**Người thực hiện:** Khoa  
**Trạng thái:** Approved

---

## 1. Mục tiêu

Implement endpoint `POST /api/v1/symptoms/check` trên Node.js backend:
- Nhận mảng symptom codes từ FE
- Lấy patient_history và allergies của user từ DB
- Gọi AI service (hiện tại: mock vì AI chưa sẵn sàng)
- Lưu kết quả vào bảng `recommendations`
- Trả kết quả về FE theo format `DrugCard` component đang dùng

---

## 2. Architecture & Data Flow

```
POST /api/v1/symptoms/check
    │
    ├─ authenticate (middleware — verify JWT, gắn req.user)
    ├─ validate(checkSchema) — symptoms: array, min 1 item
    │
    └─ RecommendationController.check(req, res, next)
           │
           └─ RecommendationService.checkSymptoms(userId, symptoms)
                  │
                  ├─ PatientHistoryRepository.findAllByUserId(userId)
                  ├─ AllergyRepository.findAllByUserId(userId)
                  ├─ #callAiService(symptoms, history, allergies)  ← mock-v0
                  └─ RecommendationRepository.create({...})        ← persist
```

---

## 3. Files

### Tạo mới

| File | Mục đích |
|---|---|
| `repositories/PatientHistoryRepository.js` | Query `patient_history` table |
| `repositories/AllergyRepository.js` | Query `allergies` table |
| `repositories/RecommendationRepository.js` | INSERT vào `recommendations` table |
| `services/RecommendationService.js` | Business logic: fetch context, call AI, save |
| `controllers/RecommendationController.js` | HTTP layer: validate input, format response |

### Sửa

| File | Thay đổi |
|---|---|
| `routes/symptomRoutes.js` | Thêm `POST /check` + wire new dependencies |

---

## 4. Repository Specs

### PatientHistoryRepository
```js
// findAllByUserId(userId)
// SELECT entry_type, title FROM patient_history WHERE user_id = $1
// Returns: [{ entry_type, title }]
```

### AllergyRepository
```js
// findAllByUserId(userId)
// SELECT drug_name FROM allergies WHERE user_id = $1
// Returns: [{ drug_name }]
```

### RecommendationRepository
```js
// create({ userId, inputSymptoms, outputDrugs, dangerAlert, engineVersion })
// INSERT INTO recommendations (user_id, input_symptoms, output_drugs, danger_alert, engine_version)
// VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at
// Returns: { id, created_at }
```

---

## 5. Service Spec — RecommendationService

```js
class RecommendationService {
  #patientHistoryRepo
  #allergyRepo
  #recommendationRepo

  constructor(patientHistoryRepo, allergyRepo, recommendationRepo) { ... }

  async checkSymptoms(userId, symptoms) {
    // 1. Lấy context của user
    const historyRows = await this.#patientHistoryRepo.findAllByUserId(userId)
    const allergyRows = await this.#allergyRepo.findAllByUserId(userId)

    const history   = historyRows.filter(r => r.entry_type === 'chronic_disease').map(r => r.title)
    const medications = historyRows.filter(r => r.entry_type === 'current_medication').map(r => r.title)
    const allergies = allergyRows.map(r => r.drug_name)

    // 2. Gọi AI (hiện tại: mock)
    const aiResult = await this.#callAiService(symptoms, history, medications, allergies)

    // 3. Lưu vào DB
    const saved = await this.#recommendationRepo.create({
      userId,
      inputSymptoms:  { symptoms, history, medications, allergies },
      outputDrugs:    aiResult,
      dangerAlert:    null,
      engineVersion:  aiResult.engineVersion,
    })

    return { id: saved.id, recommendations: aiResult.recommendations, engineVersion: aiResult.engineVersion }
  }

  // Private — swap body này khi AI service sẵn sàng
  async #callAiService(symptoms, history, medications, allergies) {
    // TODO: thay bằng fetch(`${process.env.AI_SERVICE_URL}/ai/recommend`, ...)
    return {
      engineVersion: 'mock-v0',
      recommendations: [
        {
          name: 'Paracetamol 500mg',
          generic_name: 'Paracetamol',
          confidence: 0.90,
          category: 'Giảm đau - Hạ sốt',
          reason: 'Phù hợp với triệu chứng sốt và đau đầu. Không có tương tác với thuốc đang dùng.',
          description: 'Thuốc giảm đau hạ sốt thông thường, an toàn cho hầu hết người dùng.',
          dosage: '500mg - 1g mỗi 4-6 giờ, tối đa 4g/ngày',
          contraindications: 'Suy gan nặng, dị ứng Paracetamol',
        },
        {
          name: 'Ibuprofen 400mg',
          generic_name: 'Ibuprofen',
          confidence: 0.72,
          category: 'NSAIDs - Kháng viêm',
          reason: 'Có tác dụng hạ sốt và giảm đau đầu hiệu quả.',
          description: 'Thuốc kháng viêm không steroid, hạ sốt và giảm đau.',
          dosage: '400mg mỗi 6-8 giờ sau ăn',
          contraindications: 'Loét dạ dày, suy thận nặng',
        },
      ],
    }
  }
}
```

---

## 6. Controller Spec — RecommendationController

```js
class RecommendationController {
  #recommendationService

  constructor(recommendationService) { ... }

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
```

---

## 7. Route — symptomRoutes.js (additions)

```js
// Thêm schema
const checkSchema = Joi.object({
  symptoms: Joi.array().items(Joi.string().trim()).min(1).required().messages({
    'array.min': 'Vui lòng chọn ít nhất một triệu chứng',
    'any.required': 'Danh sách triệu chứng là bắt buộc',
  }),
})

// Thêm DI
const patientHistoryRepo      = new PatientHistoryRepository(pool)
const allergyRepo             = new AllergyRepository(pool)
const recommendationRepo      = new RecommendationRepository(pool)
const recommendationService   = new RecommendationService(patientHistoryRepo, allergyRepo, recommendationRepo)
const recommendationController = new RecommendationController(recommendationService)

// Thêm route
router.post('/check', authenticate, validate(checkSchema), recommendationController.check)
```

---

## 8. Request / Response Contract

**Request:**
```json
POST /api/v1/symptoms/check
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "symptoms": ["sot", "dau_dau"] }
```

**Response 200:**
```json
{
  "success": true,
  "message": "Gợi ý thuốc thành công",
  "data": {
    "id": "uuid",
    "recommendations": [
      {
        "name": "Paracetamol 500mg",
        "generic_name": "Paracetamol",
        "confidence": 0.90,
        "category": "Giảm đau - Hạ sốt",
        "reason": "...",
        "description": "...",
        "dosage": "...",
        "contraindications": "..."
      }
    ],
    "engineVersion": "mock-v0"
  }
}
```

**Response 400 — validation:**
```json
{ "success": false, "message": "Vui lòng chọn ít nhất một triệu chứng", "code": "VALIDATION_ERROR" }
```

**Response 401 — unauthenticated:**
```json
{ "success": false, "message": "Unauthorized", "code": "UNAUTHORIZED" }
```

---

## 9. Migration khi AI service sẵn sàng

Khi Nguyên deploy AI service:
1. Mở `RecommendationService.js`, tìm method `#callAiService`
2. Thay mock body bằng:
```js
const res = await fetch(`${process.env.AI_SERVICE_URL}/ai/recommend`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ symptoms, history, medications, allergies }),
  signal: AbortSignal.timeout(10_000),
})
if (!res.ok) throw new AppError('AI service không khả dụng', 503)
return res.json()
```
3. Cập nhật `engineVersion` mapping nếu AI trả về format khác

---

## 10. Scope không thuộc task này

- Lịch sử recommendations (`GET /recommendations`) — task riêng
- Rate limiting cho endpoint này
- Error code `AI_UNAVAILABLE` / `AI_TIMEOUT` — cần khi AI service thật
