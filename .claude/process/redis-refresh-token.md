# Redis Refresh Token — POST /auth/refresh + POST /auth/logout

## Luồng chạy

### POST /auth/refresh

```
Client
  │  { refreshToken }
  ▼
Route /auth/refresh
  │  authLimiter (5 req/15min) → 429 nếu vượt
  │  validate(refreshSchema)   → 400 nếu thiếu / string > 512 ký tự
  ▼
AuthController.refresh
  │  đọc req.body.refreshToken → gọi authService.refreshToken(token)
  ▼
AuthService.refreshToken(token)
  ├─ jwt.verify(token, JWT_REFRESH_SECRET)
  │   └─ nhánh lỗi: chữ ký sai / token hết hạn → AppError 401 INVALID_REFRESH_TOKEN
  ├─ redis.get('refresh:{userId}')
  │   └─ nhánh lỗi: không tồn tại hoặc không khớp → AppError 401 INVALID_REFRESH_TOKEN
  ├─ userRepo.findById(userId)
  │   └─ nhánh lỗi: user null / inactive → AppError 401 USER_NOT_FOUND
  └─ #generateTokens(user)
      ├─ jwt.sign accessToken (15m)
      ├─ jwt.sign refreshToken (7d)
      ├─ redis.setEx('refresh:{userId}', 7d, newRefreshToken)  ← rotate: ghi đè token cũ
      └─ return { accessToken, refreshToken, user }
  ▼
AuthController
  │  res.json(ApiResponse.success(result, 'Làm mới token thành công'))
  ▼
Client ← 200 { accessToken, refreshToken, user }
```

### POST /auth/logout

```
Client
  │  { refreshToken }
  ▼
Route /auth/logout
  │  authLimiter (5 req/15min) → 429 nếu vượt
  │  validate(refreshSchema)   → 400 nếu thiếu / string > 512 ký tự
  ▼
AuthController.logout
  │  đọc req.body.refreshToken → gọi authService.logout(token)
  ▼
AuthService.logout(token)
  ├─ jwt.verify(token, JWT_REFRESH_SECRET, { ignoreExpiration: true })
  │   └─ nhánh lỗi: chữ ký sai → return (silent, không throw)
  └─ redis.del('refresh:{userId}')
  ▼
AuthController
  │  res.json(ApiResponse.success(null, 'Đăng xuất thành công'))
  ▼
Client ← 200 luôn (kể cả token đã hết hạn)
```

## Những gì xây ở từng tầng

| File | Method | Mô tả |
|---|---|---|
| `authService.js` | `refreshToken(token)` | Verify JWT → check Redis match → check user active → rotate tokens |
| `authService.js` | `logout(token)` | Verify chữ ký (bỏ qua expiry) → xóa key Redis |
| `authController.js` | `refresh` | Đọc `req.body.refreshToken` → gọi service → format response |
| `authController.js` | `logout` | Đọc `req.body.refreshToken` → gọi service → format response |
| `authRoutes.js` | `refreshSchema` | Joi: `string().max(512).required()` |
| `authRoutes.js` | POST `/refresh` | `authLimiter` + `validate(refreshSchema)` + `authController.refresh` |
| `authRoutes.js` | POST `/logout` | `authLimiter` + `validate(refreshSchema)` + `authController.logout` |

## Chú ý quan trọng

**Token rotation trong `/refresh`:**
Mỗi lần refresh thành công, `redis.setEx('refresh:{userId}', ...)` ghi đè token mới lên key cũ. Refresh token cũ không còn khớp với Redis nữa → dùng lại token cũ → 401. Đây là cơ chế phát hiện token reuse (nếu kẻ tấn công lấy được token cũ và thử dùng sau khi user đã refresh thì bị chặn).

**Logout với `ignoreExpiration: true`:**
Chủ ý dùng verify (không phải decode) để chỉ token được ký bằng JWT_REFRESH_SECRET mới được xử lý. `ignoreExpiration: true` để user vẫn có thể logout khi token vừa hết hạn. Nếu chữ ký sai hoàn toàn → return silently, không throw — thiết kế có chủ đích vì logout phải luôn thành công về UX.

**Vi phạm phát hiện bởi code reviewer (đã sửa):**
1. Ban đầu dùng `jwt.decode()` trong `logout` → forced logout attack vector (attacker tự tạo JWT với userId giả). Sửa thành `jwt.verify(..., { ignoreExpiration: true })`.
2. `/refresh` và `/logout` thiếu `authLimiter` → DoS surface qua JWT verify + Redis call. Đã thêm.
3. `refreshSchema` thiếu `.max(512)` → string lớn lọt vào `jwt.verify()`. Đã thêm.

**Invalidation chain:**
- `POST /logout` → xóa `refresh:{userId}`
- `POST /reset-password` → xóa `refresh:{userId}` (đã có từ trước)
→ Cả hai đường đều revoke được refresh token hiện tại của user.

## Kết quả tự test

| Test case | Input | Expected | Actual |
|---|---|---|---|
| Happy path refresh | Token hợp lệ từ login | 200 + tokens mới | SKIP ⏭ (server offline) |
| Happy path logout | Token hợp lệ | 200 | SKIP ⏭ |
| Token rotation | Dùng refresh token cũ sau rotate | 401 | SKIP ⏭ |
| Post-logout refresh | Refresh sau khi logout | 401 | SKIP ⏭ |
| Logout rồi refresh | Chuỗi logout → refresh | 401 | SKIP ⏭ |
| Tampered JWT | Sửa signature | 401 | SKIP ⏭ |
| Expired JWT ở /refresh | Token hết hạn | 401 | SKIP ⏭ |
| Expired JWT ở /logout | Token hết hạn | 200 silent | SKIP ⏭ |
| Forced logout attack | JWT tự tạo chữ ký giả | 200 silent (không delete gì) | SKIP ⏭ |
| Missing refreshToken field | `{}` | 400 | SKIP ⏭ |
| Payload > 512 ký tự | string 600 ký tự | 400 | SKIP ⏭ |
| Rate limit | 6 request liên tiếp | 5 đầu OK, thứ 6 → 429 | SKIP ⏭ |

Postman collection: `docs/testing/MedAssist_Auth_Refresh_Logout.postman_collection.json`

## Chuẩn bảo mật áp dụng

- **OWASP ASVS V3.3.1** — Session tokens phải được invalidate phía server khi logout
- **OWASP ASVS V3.5.2** — Stateless tokens phải được verify chữ ký, không chỉ decode
- **OWASP ASVS V13.2.1** — Rate limiting trên authentication endpoints
