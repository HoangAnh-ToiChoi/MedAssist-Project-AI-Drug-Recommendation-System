# POST /auth/login + /auth/forgot-password + /auth/reset-password

## Luồng 1 — Login

```
Client gửi POST /api/v1/auth/login
{ email, password }
        │
        ▼
[Middleware] validate(loginSchema)
  - email: string, email format, required
  - password: string, required  ← không có min/max (chỉ required)
  → Nếu sai: 400 VALIDATION_ERROR
        │
        ▼
[Controller] AuthController.login
  - Extract email, password từ req.body
  - Gọi authService.login(email, password)
  - Trả 200 + ApiResponse.success(result, 'Đăng nhập thành công')
        │
        ▼
[Service] AuthService.login
  - Gọi userRepo.findByEmail(email)
    → Nếu null: throw 401 INVALID_CREDENTIALS
  - bcrypt.compare(password, user.password_hash)
    → Nếu false: throw 401 INVALID_CREDENTIALS  ← cùng message với case trên
  - Gọi #generateTokens(user)
        │
        ▼
[Service - private] #generateTokens(user)
  - jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' })  → accessToken
  - jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' }) → refreshToken
  - redis.setEx('refresh:<userId>', 604800, refreshToken)
  - Return { accessToken, refreshToken, user: { id, email, fullName, role } }
        │
        ▼
[Repository] UserRepository.findByEmail  ← tái dụng từ register
  SELECT * FROM users WHERE email = $1 AND is_active = true
```

---

## Luồng 2 — Forgot Password

```
Client gửi POST /api/v1/auth/forgot-password
{ email }
        │
        ▼
[Service] AuthService.forgotPassword
  - Gọi userRepo.findByEmail(email)
    → Nếu null: RETURN LUÔN (không throw) ← anti-enumeration
  - crypto.randomBytes(32).toString('hex') → resetToken (64 ký tự hex)
  - redis.setEx('reset:<token>', 900, userId)  ← TTL 15 phút
  - emailTransporter.sendMail(...)
    - To: user.email
    - Link: FRONTEND_URL/reset-password?token=<token>
  → Trả 200 DÙ email có tồn tại hay không
```

---

## Luồng 3 — Reset Password

```
Client gửi POST /api/v1/auth/reset-password
{ token, newPassword }
        │
        ▼
[Middleware] validate(resetPasswordSchema)
  - token: string, required
  - newPassword: string, min 8, max 128, required
        │
        ▼
[Service] AuthService.resetPassword
  - redis.get('reset:<token>') → userId
    → Nếu null: throw 400 TOKEN_EXPIRED_OR_INVALID
  - bcrypt.hash(newPassword, 12)
  - userRepo.updatePassword(userId, passwordHash)
  - redis.del('reset:<token>')     ← token dùng 1 lần rồi xóa
  - redis.del('refresh:<userId>')  ← buộc đăng nhập lại sau reset
  → Trả 200
        │
        ▼
[Repository] UserRepository.updatePassword  ← method mới thêm
  UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2
```

---

## Vòng đời của 2 token sau khi login

```
Login thành công
    │
    ├─ accessToken (15 phút)
    │      └─ Gửi trong mọi request: Authorization: Bearer <token>
    │         Server decode → lấy userId, role
    │         Hết hạn → 401 → frontend gọi /auth/refresh
    │
    └─ refreshToken (7 ngày, lưu Redis)
           └─ Chỉ gửi khi gọi POST /auth/refresh
              Server kiểm tra Redis còn key không
              → Còn → cấp accessToken mới
              → Hết / bị xóa → 401 → đăng nhập lại

refreshToken bị xóa khỏi Redis khi:
  1. Logout (chưa implement)
  2. Reset password  ← đã implement
  3. Hết 7 ngày (Redis tự xóa)
```

---

## Những gì xây ở từng tầng

| File | Method thêm |
|---|---|
| `config/redis.js` | Redis client, reconnect tối đa 3 lần, log lỗi 1 lần |
| `config/email.js` | Nodemailer transporter, Gmail SMTP port 587 |
| `repositories/userRepository.js` | `findById(userId)`, `updatePassword(userId, hash)` |
| `services/authService.js` | `login`, `forgotPassword`, `resetPassword`, `#generateTokens` (private) |
| `controllers/authController.js` | `login`, `forgotPassword`, `resetPassword` |
| `routes/authRoutes.js` | 3 route mới + loginSchema + forgotPasswordSchema + resetPasswordSchema |

---

## Chú ý quan trọng

- **Cùng message cho sai password và email không tồn tại**: `"Email hoặc mật khẩu không đúng"` — OWASP V2.7 chống user enumeration
- **Forgot password luôn trả 200**: dù email có trong DB hay không — cùng lý do trên
- **Reset token dùng `crypto.randomBytes`**: không phải JWT — opaque string, không decode được, chỉ là key tra Redis
- **Token dùng 1 lần**: sau khi reset xong, `redis.del('reset:<token>')` ngay lập tức
- **Buộc re-login sau reset**: `redis.del('refresh:<userId>')` — refreshToken cũ bị invalidate
- **nodemailer 8.0.7+**: version 6.x có lỗ hổng SMTP injection, đã upgrade lên 8.x
- **Redis reconnect strategy**: tối đa 3 lần, không spam log

---

## Kết quả tự test

| Test case | Input | Expected | Actual |
|---|---|---|---|
| Login đúng | email + password đúng | 200 + accessToken + refreshToken + user | ✅ Pass |
| Sai password | password sai | 401 `"Email hoặc mật khẩu không đúng"` | ✅ Pass |
| Email không tồn tại | email không có trong DB | 401, **cùng message** với sai password | ✅ Pass |
| Thiếu password | không có field password | 400 VALIDATION_ERROR | ✅ Pass |
| Rate limit login | gọi > 5 lần / 15 phút | 429 RATE_LIMIT_EXCEEDED | ✅ Pass |
| passwordHash trong response | kiểm tra response JSON | Không có field này | ✅ Pass |
| Forgot - email không tồn tại | email random | 200 (không báo lỗi) | ✅ Pass |
| Forgot - email tồn tại (dev mode) | email đã đăng ký | 200 + token log ra terminal | ✅ Pass |
| Reset - token hợp lệ | token từ terminal + newPassword mới | 200 `"Đặt lại mật khẩu thành công"` | ✅ Pass |
| Reset - login bằng password mới | newPassword vừa đặt | 200 + accessToken + refreshToken | ✅ Pass |
| Reset - token sai | token ngẫu nhiên | 400 TOKEN_EXPIRED_OR_INVALID | ✅ Pass |
| Reset - token dùng lần 2 | token đã dùng rồi | 400 TOKEN_EXPIRED_OR_INVALID | ✅ Pass |
| Redis verify | `redis-cli GET refresh:<userId>` sau login | Thấy refreshToken | ✅ Pass |

**Redis**: Cài qua `winget install Redis.Redis` — service chạy tự động cùng Windows tại `C:\Program Files\Redis`.

**Lỗi từng gặp**: Reset-password trả 400 "Token là bắt buộc; Mật khẩu mới là bắt buộc" — nguyên nhân thiếu header `Content-Type: application/json` trong Postman. Không có header này thì `express.json()` bỏ qua body → `req.body = {}` → Joi validate fail toàn bộ field.

---

## Chuẩn bảo mật áp dụng

- **OWASP ASVS V2.7**: Cùng message cho sai credentials — chống user enumeration
- **OWASP ASVS V3.2**: RefreshToken lưu server-side (Redis), có thể revoke bất cứ lúc nào
- **OWASP ASVS V3.3**: Invalidate session sau reset password
