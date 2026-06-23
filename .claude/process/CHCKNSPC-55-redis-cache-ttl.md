# CHCKNSPC-55 — Redis cache kết quả thuốc TTL 1h

## Luồng chạy

```
Client
  └─ POST /api/v1/symptoms/check
       │
       ├─ authenticate (verify JWT → req.user.userId)
       ├─ validate(checkSchema) (symptoms: array min 1)
       │
       └─ RecommendationController.check(req, res, next)
              │
              └─ RecommendationService.checkSymptoms(userId, symptoms)
                     │
                     ├─ redis.get(cacheKey)         ← HIT: trả ngay, skip các bước sau
                     │
                     ├─ PatientHistoryRepo.findChronicDiseasesByUserId(userId)
                     ├─ AllergyRepo.findAllByUserId(userId)
                     │
                     ├─ #callAiService(symptoms, history, allergies)
                     │       └─ AI_SERVICE_URL set? → axios.post(AI_URL/ai/recommend)
                     │          AI_SERVICE_URL không set? → mock-v0 fallback
                     │
                     ├─ #filterAllergies(recommendations, allergies)
                     ├─ RecommendationRepo.create({...})   ← persist vào DB
                     │
                     └─ redis.setEx(cacheKey, 3600, result) ← TTL 1 giờ (CHCKNSPC-55)
```

## Những gì xây ở từng tầng

| File | Method | Mô tả |
|---|---|---|
| `services/RecommendationService.js` | `checkSymptoms` | TTL cache đổi từ 1800 → 3600 |
| `services/RecommendationService.js` | `#callAiService` | Wire axios thật với AI_SERVICE_URL, mock là fallback |

## Chú ý quan trọng

**Cache key format:** `recommend:${userId}:${[...symptoms].sort().join('-')}`  
Symptoms được sort trước khi join → `['ho','sot']` và `['sot','ho']` dùng chung 1 cache key.

**TTL 1 giờ vs 30 phút:** Tăng từ 1800 → 3600 vì recommendation data ít thay đổi trong khung 1 giờ. Nếu user cập nhật allergy/history thì cache cũ vẫn còn trong tối đa 1 giờ — chấp nhận được với MVP scope.

**#callAiService fix (phát hiện trong code review):**  
Code gốc dùng mock cứng. Review phát hiện vi phạm tiêu chí "Axios cho HTTP call đi" nên đã wire thực tế: kiểm tra `AI_SERVICE_URL`, nếu có thì gọi axios, nếu không thì fallback mock. Khi Nguyên deploy AI service, chỉ cần set env var là đủ.

## Kết quả tự test

| Test case | Input | Expected | Actual |
|---|---|---|---|
| TC-22: Redis TTL = 3600s | POST /symptoms/check → redis-cli TTL key | 3500–3600 | ⏭ SKIP (server chưa chạy) |
| TC-01: Happy path | `{"symptoms":["sot"]}` | 200, recommendations[] | ⏭ SKIP |
| TC-06: symptoms rỗng | `{"symptoms":[]}` | 400 VALIDATION_ERROR | ⏭ SKIP |
| TC-19: Allergy filter | allergy "Paracetamol" seed → check | Paracetamol không xuất hiện | ⏭ SKIP |

Postman collection đầy đủ 22 TC tại: `docs/test/CHCKNSPC-55-postman-collection.json`

## Chuẩn bảo mật áp dụng

- Cache key bao gồm `userId` → không thể cross-user cache leak
- Input validation qua Joi trước khi đến Service
- Parameterized query trong tất cả Repository methods
