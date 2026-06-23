# CHCKNSPC-55: Redis Cache TTL 1h cho kết quả thuốc — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tăng TTL Redis cache cho kết quả gợi ý thuốc từ 30 phút lên 1 giờ.

**Architecture:** `RecommendationService.checkSymptoms` cache kết quả với key `recommend:${userId}:${symptoms.sort().join('-')}`. Hiện TTL là 1800s, cần đổi thành 3600s.

**Tech Stack:** Node.js, ioredis/redis, Jest

---

### Task 1: Đổi TTL recommend cache từ 1800 lên 3600

**Files:**
- Modify: `backend/src/services/RecommendationService.js:43`

- [ ] **Step 1: Mở file và xác nhận dòng cần đổi**

Đọc `backend/src/services/RecommendationService.js`. Tìm dòng:
```js
await this.#redis.setEx(cacheKey, 1800, JSON.stringify(result))
```
Dòng này nằm trong method `checkSymptoms`, sau khi kết quả đã được lưu DB.

- [ ] **Step 2: Đổi TTL**

Sửa dòng 43 thành:
```js
await this.#redis.setEx(cacheKey, 3600, JSON.stringify(result))
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/RecommendationService.js
git commit -m "feat: CHCKNSPC-55 Redis cache truy vấn kết quả thuốc TTL 1h"
```
