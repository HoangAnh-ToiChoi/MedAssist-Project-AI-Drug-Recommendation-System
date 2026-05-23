# POST /auth/register — Đăng ký tài khoản

## Luồng chạy

```
Client gửi POST /api/v1/auth/register
{ email, password, fullName }
        │
        ▼
[Middleware] validate(registerSchema)
  - email: string, email format, required
  - password: string, min 8, max 128, required
  - fullName: string, min 2, max 100, required
  → Nếu sai: 400 VALIDATION_ERROR, dừng tại đây
        │
        ▼
[Controller] AuthController.register
  - Extract email, password, fullName từ req.body
  - Gọi authService.register(email, password, fullName)
  - Trả 201 + ApiResponse.success(user, 'Đăng ký thành công')
        │
        ▼
[Service] AuthService.register
  - Gọi userRepo.findByEmail(email)
    → Nếu có user: throw AppError 409 EMAIL_ALREADY_EXISTS
  - bcrypt.hash(password, 12)   ← plain text password biến mất tại đây
  - Gọi userRepo.createUser({ email, passwordHash, fullName })
  - Return { id, email, fullName, createdAt }  ← không có passwordHash
        │
        ▼
[Repository] UserRepository.createUser
  INSERT INTO users (id, email, password_hash, full_name)
  VALUES (gen_random_uuid(), $1, $2, $3)
  RETURNING id, email, full_name, created_at
```

---

## Những gì xây ở từng tầng

### Foundation (tạo mới toàn bộ — backend trống ban đầu)
| File | Vai trò |
|---|---|
| `package.json` | express, pg, bcryptjs, jsonwebtoken, joi, redis, dotenv, cors, express-rate-limit, nodemailer |
| `src/utils/AppError.js` | Custom error class: message + statusCode + code + isOperational |
| `src/utils/ApiResponse.js` | Static: `success(data, message)` và `error(message, code)` |
| `src/config/db.js` | pg Pool từ DATABASE_URL, SSL, max 10 connections |
| `src/middlewares/validate.js` | Factory nhận Joi schema → trả Express middleware |
| `src/middlewares/errorHandler.js` | Catch AppError (operational) + JWT error + unexpected (500) |
| `src/app.js` | Express app: cors, json, routes, errorHandler |
| `server.js` | Ping DB trước khi listen — fail fast nếu DB không connect |

### Auth layer
| File | Method thêm |
|---|---|
| `repositories/userRepository.js` | `findByEmail(email)`, `createUser({ email, passwordHash, fullName })` |
| `services/authService.js` | `register(email, password, fullName)` |
| `controllers/authController.js` | `register` handler |
| `routes/authRoutes.js` | `POST /register` + registerSchema + authLimiter |

---

## Chú ý quan trọng

- **bcrypt cost 12**: ~250ms/hash — đủ chậm để brute-force không khả thi, không quá chậm với UX
- **Rate limit 5 req/15 phút**: chống automated signup spam
- **`findByEmail` query lọc `is_active = true`**: user bị deactivate không thể đăng ký lại bằng email cũ
- **`RETURNING id, email, full_name, created_at`**: Repository không trả `password_hash` ngay từ đầu
- **Parameterized query `$1, $2, $3`**: chống SQL injection hoàn toàn
- **OOP**: tất cả dependencies dùng `#private` field + inject qua constructor — không `new` bên trong class

---

## Kết quả tự test

| Test case | Input | Expected | Actual |
|---|---|---|---|
| Happy path | email + password + fullName hợp lệ | 201 + user object | ✅ Pass |
| Duplicate email | Gửi 2 lần cùng email | 409 EMAIL_ALREADY_EXISTS | ✅ Pass |
| Password < 8 ký tự | `"password": "123"` | 400 VALIDATION_ERROR | ✅ Pass |
| Email sai định dạng | `"email": "notanemail"` | 400 VALIDATION_ERROR | ✅ Pass |
| Thiếu fullName | Không có field fullName | 400 VALIDATION_ERROR | ✅ Pass |
| Rate limit | Gọi > 5 lần / 15 phút | 429 RATE_LIMIT_EXCEEDED | ✅ Pass |
| passwordHash trong response | Kiểm tra response JSON | Không có field này | ✅ Pass |
| SQL injection | `fullName: "'; DROP TABLE users; --"` | Xử lý an toàn, không crash | ✅ Pass |

**DB verify**: Supabase dashboard — `password_hash` lưu đúng format `$2b$12$...` (bcrypt), không phải plain text.

---

## Chuẩn bảo mật áp dụng

- **OWASP ASVS V2.4.1**: Không lưu plain text password
- **OWASP ASVS V2.1.1**: Password min 8 ký tự
- **OWASP ASVS V2.1.2**: Password max 128 ký tự
- **OWASP ASVS V5.1**: Parameterized query chống SQL injection
