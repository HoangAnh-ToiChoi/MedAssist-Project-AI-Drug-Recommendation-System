# Design Spec — CHCKNSPC-55: Redis cache truy vấn kết quả thuốc TTL 1h

**Ngày:** 2026-05-24  
**Task:** CHCKNSPC-55  
**Trạng thái:** Approved

---

## Mục tiêu

Tăng TTL của Redis cache cho kết quả gợi ý thuốc từ 30 phút lên 1 giờ.

---

## Thay đổi

**File:** `backend/src/services/RecommendationService.js` — dòng 43

```js
// Before (TTL 30 phút)
await this.#redis.setEx(cacheKey, 1800, JSON.stringify(result))

// After (TTL 1 giờ)
await this.#redis.setEx(cacheKey, 3600, JSON.stringify(result))
```

- Cache key: `recommend:${userId}:${symptoms.sort().join('-')}` — không đổi
- Dữ liệu cached: `{ id, recommendations, engineVersion }` — không đổi

---

## Scope không thuộc task này

- Cache invalidation khi user cập nhật allergies/history
- Drug detail endpoint (`GET /drugs/:id`)