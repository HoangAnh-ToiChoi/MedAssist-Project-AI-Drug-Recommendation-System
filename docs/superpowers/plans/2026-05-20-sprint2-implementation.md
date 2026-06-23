# Sprint 2 — Auth + Symptom Input + Drug Recommendation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** End-to-end flow: đăng ký → đăng nhập → nhập triệu chứng text tự do → nhận gợi ý thuốc có giải thích — chạy được trên staging trước 25/5/2026.

**Architecture:** Backend Node.js/Express theo 4-layer pattern (Route→Controller→Service→Repository). AI Service FastAPI trả gợi ý dựa trên rule-based engine (symptom weight × match count). Frontend React gọi Backend, không bao giờ gọi AI Service trực tiếp.

**Tech Stack:** Node.js 20 · Express 4 · PostgreSQL (Supabase) · Redis · JWT · Python 3.11 · FastAPI · scikit-learn · React 18 · TailwindCSS · Vite · Axios

**Deadline:** 25/05/2026

---

## File Structure

```
backend/
├── package.json
├── server.js
└── src/
    ├── config/
    │   ├── db.js             ← PostgreSQL pool
    │   └── redis.js          ← Redis client
    ├── utils/
    │   ├── ApiResponse.js    ← chuẩn hóa response shape
    │   └── AppError.js       ← custom error class
    ├── middlewares/
    │   ├── auth.js           ← verifyToken middleware
    │   ├── errorHandler.js   ← global error handler
    │   └── rateLimiter.js    ← express-rate-limit
    ├── repositories/
    │   ├── UserRepository.js
    │   ├── SymptomRepository.js
    │   └── RecommendationRepository.js
    ├── services/
    │   ├── AuthService.js
    │   ├── SymptomService.js
    │   └── RecommendationService.js
    ├── controllers/
    │   ├── AuthController.js
    │   ├── SymptomController.js
    │   └── RecommendationController.js
    └── routes/
        ├── auth.js
        ├── symptoms.js
        └── recommendations.js

ai-service/
├── requirements.txt
├── main.py
├── routers/
│   └── recommend.py
├── services/
│   ├── nlp_mapper.py         ← text → symptom IDs
│   └── rule_engine.py        ← symptom IDs → drug list
├── models/
│   └── schemas.py            ← Pydantic request/response
└── data/
    ├── symptoms/symptoms.json
    └── drugs/drugs.json

frontend/src/
├── contexts/
│   └── AuthContext.jsx
├── hooks/
│   └── useAuth.js
├── pages/
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── OTPVerifyPage.jsx
│   ├── DashboardPage.jsx
│   ├── SymptomInputPage.jsx
│   └── ResultsPage.jsx
├── components/
│   └── symptoms/
│       ├── SymptomSelector.jsx   ← cập nhật: free text input
│       ├── SeverityPicker.jsx    ← Nhẹ/Vừa/Nặng
│       ├── DrugCard.jsx          ← cập nhật: thêm reason
│       └── DangerAlert.jsx       ← banner cảnh báo nguy hiểm
└── services/
    └── api.js                    ← đã có, thêm auth/symptom/rec calls

docs/
└── database/
    └── schema.sql
```

---

## PHẦN A — Database (Tín)

### Task 1: Schema SQL + Seed Data

**Files:**
- Create: `docs/database/schema.sql`
- Create: `docs/database/seed.sql`

- [ ] **Bước 1: Tạo schema.sql**

```sql
-- docs/database/schema.sql
-- Chạy lần đầu trên Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),                 -- NULL nếu đăng nhập Google
  google_id     VARCHAR(255) UNIQUE,
  role          VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  is_verified   BOOLEAN NOT NULL DEFAULT false,
  is_locked     BOOLEAN NOT NULL DEFAULT false,
  locked_until  TIMESTAMPTZ,
  login_attempts INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. refresh_tokens
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. otp_codes (cho email verification)
CREATE TABLE otp_codes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       VARCHAR(255) NOT NULL,
  code        VARCHAR(6) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. symptoms
CREATE TABLE symptoms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        VARCHAR(50) UNIQUE NOT NULL,   -- 'sot', 'dau_dau'
  name_vi     VARCHAR(100) NOT NULL,          -- 'Sốt'
  name_en     VARCHAR(100) NOT NULL,          -- 'Fever'
  keywords    TEXT[],                          -- ['sốt','nóng','nhiệt độ cao']
  is_danger   BOOLEAN NOT NULL DEFAULT false, -- true = cảnh báo đến BV
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. drugs
CREATE TABLE drugs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                VARCHAR(50) UNIQUE NOT NULL,
  name_vi             VARCHAR(200) NOT NULL,
  name_en             VARCHAR(200),
  active_ingredient   VARCHAR(200) NOT NULL,
  drug_class          VARCHAR(100),
  warnings            TEXT[],
  contraindications   TEXT[],
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. drug_symptoms (mapping N-N với confidence weight)
CREATE TABLE drug_symptoms (
  drug_id         UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  symptom_id      UUID NOT NULL REFERENCES symptoms(id) ON DELETE CASCADE,
  weight          DECIMAL(3,2) NOT NULL DEFAULT 1.0 CHECK (weight BETWEEN 0 AND 1),
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (drug_id, symptom_id)
);

-- 7. patient_history
CREATE TABLE patient_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_type    VARCHAR(30) NOT NULL CHECK (entry_type IN ('chronic_disease','current_medication','diagnosis')),
  title         VARCHAR(200) NOT NULL,
  detail        TEXT,
  diagnosed_at  DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. allergies
CREATE TABLE allergies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drug_name   VARCHAR(200) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, drug_name)
);

-- 9. recommendations
CREATE TABLE recommendations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input_symptoms  JSONB NOT NULL,    -- [{"id":"...","name":"sot","severity":"medium"}]
  output_drugs    JSONB NOT NULL,    -- [{drug_id, name, confidence, reason, ...}]
  danger_alert    TEXT,
  engine_version  VARCHAR(20),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index để query nhanh
CREATE INDEX idx_recommendations_user_created ON recommendations(user_id, created_at DESC);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_patient_history_user ON patient_history(user_id);
CREATE INDEX idx_allergies_user ON allergies(user_id);
CREATE INDEX idx_otp_email ON otp_codes(email, used, expires_at);
```

- [ ] **Bước 2: Tạo seed.sql với 5 triệu chứng + 5 thuốc để test**

```sql
-- docs/database/seed.sql
-- Chạy SAU schema.sql

INSERT INTO symptoms (code, name_vi, name_en, keywords, is_danger) VALUES
('sot',        'Sốt',        'Fever',       ARRAY['sốt','nóng','nhiệt độ cao','39 độ','38 độ'], false),
('dau_dau',    'Đau đầu',    'Headache',    ARRAY['đau đầu','nhức đầu','chóng mặt nhẹ'],        false),
('ho',         'Ho',         'Cough',       ARRAY['ho','ho khan','ho có đờm','ho nhiều'],        false),
('dau_hong',   'Đau họng',   'Sore Throat', ARRAY['đau họng','rát họng','khó nuốt','viêm họng'],false),
('dau_nguyen', 'Đau ngực',   'Chest Pain',  ARRAY['đau ngực','tức ngực','khó thở','nặng ngực'], true);

INSERT INTO drugs (code, name_vi, active_ingredient, drug_class, warnings, contraindications) VALUES
('paracetamol_500',
 'Paracetamol 500mg',
 'Paracetamol (Acetaminophen)',
 'Giảm đau - Hạ sốt',
 ARRAY['Không dùng quá 8 viên/ngày','Tránh dùng cùng rượu bia','Không dùng cho người suy gan'],
 ARRAY['Dị ứng paracetamol','Suy gan nặng']),

('ibuprofen_400',
 'Ibuprofen 400mg',
 'Ibuprofen',
 'NSAIDs - Chống viêm - Giảm đau',
 ARRAY['Dùng sau khi ăn','Không dùng cho phụ nữ có thai trên 20 tuần','Theo dõi huyết áp'],
 ARRAY['Loét dạ dày','Suy thận','Dị ứng NSAIDs']),

('amoxicillin_500',
 'Amoxicillin 500mg',
 'Amoxicillin',
 'Kháng sinh - Penicillin',
 ARRAY['Uống đủ liệu trình 7-10 ngày','Uống trước hoặc sau bữa ăn đều được'],
 ARRAY['Dị ứng penicillin','Dị ứng amoxicillin']),

('cetirizine_10',
 'Cetirizine 10mg',
 'Cetirizine HCl',
 'Kháng histamine',
 ARRAY['Có thể gây buồn ngủ','Không lái xe sau khi uống'],
 ARRAY['Dị ứng cetirizine','Suy thận nặng']),

('strepsils',
 'Strepsils Đau Họng',
 'Amylmetacresol + 2,4-Dichlorobenzyl alcohol',
 'Sát khuẩn tại chỗ',
 ARRAY['Không dùng cho trẻ dưới 6 tuổi','Không nuốt viên ngậm'],
 ARRAY['Dị ứng thành phần']);

-- Mapping drug_symptoms
-- Lấy UUID bằng subquery
INSERT INTO drug_symptoms (drug_id, symptom_id, weight, is_primary)
SELECT d.id, s.id, weight, is_primary FROM (VALUES
  ('paracetamol_500', 'sot',     0.95, true),
  ('paracetamol_500', 'dau_dau', 0.80, true),
  ('ibuprofen_400',   'sot',     0.85, true),
  ('ibuprofen_400',   'dau_dau', 0.90, true),
  ('ibuprofen_400',   'dau_hong',0.60, false),
  ('amoxicillin_500', 'ho',      0.70, false),
  ('amoxicillin_500', 'dau_hong',0.85, true),
  ('amoxicillin_500', 'sot',     0.65, false),
  ('cetirizine_10',   'ho',      0.60, false),
  ('strepsils',       'dau_hong',0.90, true),
  ('strepsils',       'ho',      0.55, false)
) AS v(drug_code, symptom_code, weight, is_primary)
JOIN drugs d ON d.code = v.drug_code
JOIN symptoms s ON s.code = v.symptom_code;
```

- [ ] **Bước 3: Chạy trên Supabase**

Vào Supabase Dashboard → SQL Editor → chạy `schema.sql` trước, `seed.sql` sau.

Kiểm tra: `SELECT COUNT(*) FROM symptoms;` → kết quả `5`.

- [ ] **Bước 4: Lưu DATABASE_URL**

Vào Supabase → Settings → Database → Connection string (URI mode):
```
postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
```
Lưu vào `backend/.env` (tạo file này, KHÔNG commit):
```env
DATABASE_URL=postgresql://postgres:...
```

- [ ] **Bước 5: Commit**

```bash
git add docs/database/schema.sql docs/database/seed.sql
git commit -m "docs: add database schema and seed data for Sprint 2"
```

---

## PHẦN B — Backend API (HA)

### Task 2: Bootstrap Backend Project

**Files:**
- Create: `backend/package.json`
- Create: `backend/server.js`
- Create: `backend/.env.example`

- [ ] **Bước 1: Tạo package.json**

```json
{
  "name": "medassist-backend",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "test": "jest --coverage"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "redis": "^4.6.10",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^6.9.7",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.1",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.4"
  }
}
```

- [ ] **Bước 2: Tạo .env.example**

```env
# backend/.env.example
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/medassist
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=change_me_access_secret_min_32_chars
JWT_REFRESH_SECRET=change_me_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
MAIL_FROM=MedAssist <noreply@medassist.app>

AI_SERVICE_URL=http://localhost:8000
GOOGLE_CLIENT_ID=your_google_client_id

NODE_ENV=development
```

- [ ] **Bước 3: Tạo server.js**

```javascript
// backend/server.js
require('dotenv').config()
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const { errorHandler } = require('./src/middlewares/errorHandler')
const authRoutes = require('./src/routes/auth')
const symptomRoutes = require('./src/routes/symptoms')
const recommendationRoutes = require('./src/routes/recommendations')

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }))
app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }))

app.use('/api/auth', authRoutes)
app.use('/api/symptoms', symptomRoutes)
app.use('/api/recommendations', recommendationRoutes)

app.use(errorHandler)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Backend running on :${PORT}`))

module.exports = app
```

- [ ] **Bước 4: Cài dependencies**

```bash
cd backend && npm install
```

- [ ] **Bước 5: Commit**

```bash
git add backend/package.json backend/server.js backend/.env.example
git commit -m "feat: bootstrap backend project structure"
```

---

### Task 3: Config + Utils + Middleware

**Files:**
- Create: `backend/src/config/db.js`
- Create: `backend/src/config/redis.js`
- Create: `backend/src/utils/ApiResponse.js`
- Create: `backend/src/utils/AppError.js`
- Create: `backend/src/middlewares/errorHandler.js`
- Create: `backend/src/middlewares/auth.js`

- [ ] **Bước 1: Tạo db.js**

```javascript
// backend/src/config/db.js
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

pool.on('error', (err) => console.error('DB pool error:', err))

module.exports = pool
```

- [ ] **Bước 2: Tạo redis.js**

```javascript
// backend/src/config/redis.js
const { createClient } = require('redis')

const client = createClient({ url: process.env.REDIS_URL })
client.on('error', (err) => console.error('Redis error:', err))
client.connect()

module.exports = client
```

- [ ] **Bước 3: Tạo AppError.js**

```javascript
// backend/src/utils/AppError.js
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
  }
}

module.exports = AppError
```

- [ ] **Bước 4: Tạo ApiResponse.js**

```javascript
// backend/src/utils/ApiResponse.js
class ApiResponse {
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({ success: true, message, data })
  }

  static error(res, message, statusCode = 400, code = 'BAD_REQUEST') {
    return res.status(statusCode).json({ success: false, message, code })
  }
}

module.exports = ApiResponse
```

- [ ] **Bước 5: Tạo errorHandler.js**

```javascript
// backend/src/middlewares/errorHandler.js
const AppError = require('../utils/AppError')

const errorHandler = (err, req, res, next) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({ success: false, message: err.message, code: err.code })
  }
  console.error('Unexpected error:', err)
  return res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' })
}

module.exports = { errorHandler }
```

- [ ] **Bước 6: Tạo auth middleware**

```javascript
// backend/src/middlewares/auth.js
const jwt = require('jsonwebtoken')
const AppError = require('../utils/AppError')

const verifyToken = (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401, 'UNAUTHORIZED'))
  }
  const token = header.split(' ')[1]
  try {
    req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    next()
  } catch {
    next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'))
  }
}

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return next(new AppError('Forbidden', 403, 'FORBIDDEN'))
  next()
}

module.exports = { verifyToken, requireAdmin }
```

- [ ] **Bước 7: Test health endpoint**

```bash
cd backend && npm run dev
curl http://localhost:5000/health
# Expected: {"status":"ok","ts":"..."}
```

- [ ] **Bước 8: Commit**

```bash
git add backend/src/
git commit -m "feat: add backend config, utils, and middleware"
```

---

### Task 4: Auth — UserRepository + AuthService

**Files:**
- Create: `backend/src/repositories/UserRepository.js`
- Create: `backend/src/services/AuthService.js`
- Create: `backend/tests/auth.test.js`

- [ ] **Bước 1: Tạo UserRepository.js**

```javascript
// backend/src/repositories/UserRepository.js
const pool = require('../config/db')

class UserRepository {
  async findByEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )
    return rows[0] || null
  }

  async findById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    )
    return rows[0] || null
  }

  async create({ fullName, email, passwordHash, googleId, role = 'user' }) {
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, google_id, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [fullName, email, passwordHash, googleId, role]
    )
    return rows[0]
  }

  async verifyEmail(email) {
    const { rows } = await pool.query(
      'UPDATE users SET is_verified = true, updated_at = NOW() WHERE email = $1 RETURNING *',
      [email]
    )
    return rows[0]
  }

  async incrementLoginAttempts(userId) {
    await pool.query(
      `UPDATE users
       SET login_attempts = login_attempts + 1,
           is_locked = CASE WHEN login_attempts + 1 >= 5 THEN true ELSE false END,
           locked_until = CASE WHEN login_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END,
           updated_at = NOW()
       WHERE id = $1`,
      [userId]
    )
  }

  async resetLoginAttempts(userId) {
    await pool.query(
      'UPDATE users SET login_attempts = 0, is_locked = false, locked_until = NULL, updated_at = NOW() WHERE id = $1',
      [userId]
    )
  }

  async saveRefreshToken(userId, tokenHash, expiresAt) {
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    )
  }

  async findRefreshToken(tokenHash) {
    const { rows } = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()',
      [tokenHash]
    )
    return rows[0] || null
  }

  async revokeRefreshToken(tokenHash) {
    await pool.query(
      'UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1',
      [tokenHash]
    )
  }

  async saveOTP(email, code) {
    // Hủy OTP cũ chưa dùng
    await pool.query('UPDATE otp_codes SET used = true WHERE email = $1 AND used = false', [email])
    await pool.query(
      'INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'10 minutes\')',
      [email, code]
    )
  }

  async verifyOTP(email, code) {
    const { rows } = await pool.query(
      'SELECT * FROM otp_codes WHERE email = $1 AND code = $2 AND used = false AND expires_at > NOW()',
      [email, code]
    )
    if (rows[0]) {
      await pool.query('UPDATE otp_codes SET used = true WHERE id = $1', [rows[0].id])
      return true
    }
    return false
  }
}

module.exports = UserRepository
```

- [ ] **Bước 2: Tạo AuthService.js**

```javascript
// backend/src/services/AuthService.js
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const AppError = require('../utils/AppError')

class AuthService {
  constructor(userRepository) {
    this.userRepo = userRepository
    this.mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }

  _generateOTP() {
    return String(Math.floor(100000 + Math.random() * 900000))
  }

  _generateTokens(userId, role) {
    const accessToken = jwt.sign(
      { userId, role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
    )
    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
    )
    return { accessToken, refreshToken }
  }

  async register({ fullName, email, password }) {
    const existing = await this.userRepo.findByEmail(email)
    if (existing) throw new AppError('Email đã được sử dụng', 409, 'EMAIL_EXISTS')

    const passwordHash = await bcrypt.hash(password, 12)
    await this.userRepo.create({ fullName, email, passwordHash })

    const otp = this._generateOTP()
    await this.userRepo.saveOTP(email, otp)

    await this.mailer.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'MedAssist — Xác thực tài khoản',
      html: `<p>Mã OTP của bạn: <strong>${otp}</strong> (hết hạn sau 10 phút)</p>`,
    })

    return { message: 'Đăng ký thành công. Vui lòng kiểm tra email để nhập OTP.' }
  }

  async verifyOTP({ email, code }) {
    const ok = await this.userRepo.verifyOTP(email, code)
    if (!ok) throw new AppError('OTP không đúng hoặc đã hết hạn', 400, 'OTP_INVALID')
    const user = await this.userRepo.verifyEmail(email)
    const { accessToken, refreshToken } = this._generateTokens(user.id, user.role)
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await this.userRepo.saveRefreshToken(user.id, tokenHash, expiresAt)
    return { accessToken, refreshToken, user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role } }
  }

  async login({ email, password }) {
    const user = await this.userRepo.findByEmail(email)
    if (!user) throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS')
    if (!user.is_verified) throw new AppError('Tài khoản chưa xác thực email', 403, 'NOT_VERIFIED')
    if (user.is_locked && user.locked_until > new Date()) {
      throw new AppError(`Tài khoản bị khóa đến ${user.locked_until.toLocaleTimeString()}`, 423, 'ACCOUNT_LOCKED')
    }

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      await this.userRepo.incrementLoginAttempts(user.id)
      throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS')
    }

    await this.userRepo.resetLoginAttempts(user.id)
    const { accessToken, refreshToken } = this._generateTokens(user.id, user.role)
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await this.userRepo.saveRefreshToken(user.id, tokenHash, expiresAt)
    return { accessToken, refreshToken, user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role } }
  }

  async refreshToken({ refreshToken }) {
    let payload
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    } catch {
      throw new AppError('Refresh token không hợp lệ', 401, 'UNAUTHORIZED')
    }
    const crypto = require('crypto')
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    const stored = await this.userRepo.findRefreshToken(tokenHash)
    if (!stored) throw new AppError('Refresh token đã hết hạn hoặc bị thu hồi', 401, 'UNAUTHORIZED')

    const user = await this.userRepo.findById(payload.userId)
    const { accessToken } = this._generateTokens(user.id, user.role)
    return { accessToken }
  }

  async logout({ refreshToken }) {
    const crypto = require('crypto')
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    await this.userRepo.revokeRefreshToken(tokenHash)
  }
}

module.exports = AuthService
```

- [ ] **Bước 3: Viết test đơn giản**

```javascript
// backend/tests/auth.test.js
const AuthService = require('../src/services/AuthService')
const AppError = require('../src/utils/AppError')

describe('AuthService', () => {
  let service
  let mockRepo

  beforeEach(() => {
    mockRepo = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      saveOTP: jest.fn(),
    }
    service = new AuthService(mockRepo)
    service.mailer = { sendMail: jest.fn().mockResolvedValue({}) }
  })

  test('register throws if email exists', async () => {
    mockRepo.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com' })
    await expect(service.register({ fullName: 'A', email: 'a@b.com', password: 'Pass123!' }))
      .rejects.toThrow('Email đã được sử dụng')
  })

  test('register creates user and sends OTP if email is new', async () => {
    mockRepo.findByEmail.mockResolvedValue(null)
    mockRepo.create.mockResolvedValue({ id: '2' })
    const result = await service.register({ fullName: 'B', email: 'b@c.com', password: 'Pass123!' })
    expect(mockRepo.create).toHaveBeenCalledTimes(1)
    expect(service.mailer.sendMail).toHaveBeenCalledTimes(1)
    expect(result.message).toContain('OTP')
  })
})
```

- [ ] **Bước 4: Chạy test**

```bash
cd backend && npx jest tests/auth.test.js --no-coverage
# Expected: 2 tests PASS
```

- [ ] **Bước 5: Commit**

```bash
git add backend/src/repositories/UserRepository.js backend/src/services/AuthService.js backend/tests/
git commit -m "feat: add UserRepository and AuthService with OTP registration"
```

---

### Task 5: Auth — Controller + Routes

**Files:**
- Create: `backend/src/controllers/AuthController.js`
- Create: `backend/src/routes/auth.js`

- [ ] **Bước 1: Tạo AuthController.js**

```javascript
// backend/src/controllers/AuthController.js
const ApiResponse = require('../utils/ApiResponse')

class AuthController {
  constructor(authService) {
    this.authService = authService
    this.register = this.register.bind(this)
    this.verifyOTP = this.verifyOTP.bind(this)
    this.login = this.login.bind(this)
    this.refresh = this.refresh.bind(this)
    this.logout = this.logout.bind(this)
    this.me = this.me.bind(this)
  }

  async register(req, res, next) {
    try {
      const { fullName, email, password } = req.body
      if (!fullName || !email || !password) return ApiResponse.error(res, 'Thiếu thông tin bắt buộc', 400)
      if (password.length < 8) return ApiResponse.error(res, 'Mật khẩu tối thiểu 8 ký tự', 400)
      const result = await this.authService.register({ fullName, email, password })
      return ApiResponse.success(res, result, result.message, 201)
    } catch (err) { next(err) }
  }

  async verifyOTP(req, res, next) {
    try {
      const { email, code } = req.body
      if (!email || !code) return ApiResponse.error(res, 'Thiếu email hoặc code', 400)
      const result = await this.authService.verifyOTP({ email, code })
      return ApiResponse.success(res, result, 'Xác thực thành công')
    } catch (err) { next(err) }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body
      if (!email || !password) return ApiResponse.error(res, 'Thiếu email hoặc mật khẩu', 400)
      const result = await this.authService.login({ email, password })
      return ApiResponse.success(res, result, 'Đăng nhập thành công')
    } catch (err) { next(err) }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body
      if (!refreshToken) return ApiResponse.error(res, 'Thiếu refresh token', 400)
      const result = await this.authService.refreshToken({ refreshToken })
      return ApiResponse.success(res, result)
    } catch (err) { next(err) }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body
      if (refreshToken) await this.authService.logout({ refreshToken })
      return ApiResponse.success(res, null, 'Đăng xuất thành công')
    } catch (err) { next(err) }
  }

  async me(req, res, next) {
    try {
      return ApiResponse.success(res, { userId: req.user.userId, role: req.user.role })
    } catch (err) { next(err) }
  }
}

module.exports = AuthController
```

- [ ] **Bước 2: Tạo routes/auth.js**

```javascript
// backend/src/routes/auth.js
const express = require('express')
const router = express.Router()
const UserRepository = require('../repositories/UserRepository')
const AuthService = require('../services/AuthService')
const AuthController = require('../controllers/AuthController')
const { verifyToken } = require('../middlewares/auth')

const userRepo = new UserRepository()
const authService = new AuthService(userRepo)
const authCtrl = new AuthController(authService)

router.post('/register',    authCtrl.register)
router.post('/verify-otp',  authCtrl.verifyOTP)
router.post('/login',       authCtrl.login)
router.post('/refresh',     authCtrl.refresh)
router.post('/logout',      authCtrl.logout)
router.get('/me',           verifyToken, authCtrl.me)

module.exports = router
```

- [ ] **Bước 3: Test thủ công**

```bash
# Đảm bảo backend đang chạy
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@example.com","password":"Password123"}'

# Expected: {"success":true,"message":"Đăng ký thành công...","data":{...}}
```

- [ ] **Bước 4: Commit**

```bash
git add backend/src/controllers/AuthController.js backend/src/routes/auth.js
git commit -m "feat: add auth controller and routes (register, login, OTP, refresh)"
```

---

### Task 6: Symptoms + Recommendations API

**Files:**
- Create: `backend/src/repositories/SymptomRepository.js`
- Create: `backend/src/repositories/RecommendationRepository.js`
- Create: `backend/src/services/SymptomService.js`
- Create: `backend/src/services/RecommendationService.js`
- Create: `backend/src/controllers/SymptomController.js`
- Create: `backend/src/controllers/RecommendationController.js`
- Create: `backend/src/routes/symptoms.js`
- Create: `backend/src/routes/recommendations.js`

- [ ] **Bước 1: Tạo SymptomRepository.js**

```javascript
// backend/src/repositories/SymptomRepository.js
const pool = require('../config/db')

class SymptomRepository {
  async findAll() {
    const { rows } = await pool.query(
      'SELECT id, code, name_vi, name_en, keywords, is_danger FROM symptoms ORDER BY name_vi'
    )
    return rows
  }

  async findByIds(ids) {
    const { rows } = await pool.query(
      'SELECT id, code, name_vi, name_en, is_danger FROM symptoms WHERE id = ANY($1)',
      [ids]
    )
    return rows
  }
}

module.exports = SymptomRepository
```

- [ ] **Bước 2: Tạo RecommendationRepository.js**

```javascript
// backend/src/repositories/RecommendationRepository.js
const pool = require('../config/db')

class RecommendationRepository {
  async save({ userId, inputSymptoms, outputDrugs, dangerAlert, engineVersion }) {
    const { rows } = await pool.query(
      `INSERT INTO recommendations (user_id, input_symptoms, output_drugs, danger_alert, engine_version)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, JSON.stringify(inputSymptoms), JSON.stringify(outputDrugs), dangerAlert, engineVersion]
    )
    return rows[0]
  }

  async findByUser(userId, limit = 20) {
    const { rows } = await pool.query(
      `SELECT id, input_symptoms, output_drugs, danger_alert, engine_version, created_at
       FROM recommendations
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    )
    return rows
  }

  async findById(id, userId) {
    const { rows } = await pool.query(
      'SELECT * FROM recommendations WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    return rows[0] || null
  }
}

module.exports = RecommendationRepository
```

- [ ] **Bước 3: Tạo RecommendationService.js**

```javascript
// backend/src/services/RecommendationService.js
const axios = require('axios')
const AppError = require('../utils/AppError')

class RecommendationService {
  constructor(recommendationRepository) {
    this.recRepo = recommendationRepository
    this.aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000'
  }

  async _getUserContext(userId, pool) {
    const [historyResult, allergyResult] = await Promise.all([
      pool.query(
        "SELECT entry_type, title, detail FROM patient_history WHERE user_id = $1",
        [userId]
      ),
      pool.query(
        "SELECT drug_name FROM allergies WHERE user_id = $1",
        [userId]
      ),
    ])
    const history = historyResult.rows.filter(r => r.entry_type === 'chronic_disease').map(r => r.title)
    const medications = historyResult.rows.filter(r => r.entry_type === 'current_medication').map(r => r.title)
    const allergies = allergyResult.rows.map(r => r.drug_name)
    return { history, medications, allergies }
  }

  async recommend({ userId, symptomsText, pool }) {
    const context = await this._getUserContext(userId, pool)

    let aiResponse
    try {
      const { data } = await axios.post(`${this.aiUrl}/ai/recommend`, {
        symptoms_text: symptomsText,
        history: context.history,
        medications: context.medications,
        allergies: context.allergies,
      }, { timeout: 8000 })
      aiResponse = data
    } catch (err) {
      throw new AppError('AI service không phản hồi. Vui lòng thử lại.', 503, 'AI_UNAVAILABLE')
    }

    const saved = await this.recRepo.save({
      userId,
      inputSymptoms: { text: symptomsText, recognized: aiResponse.recognized_symptoms },
      outputDrugs: aiResponse.recommendations,
      dangerAlert: aiResponse.danger_alert,
      engineVersion: aiResponse.engine_version,
    })

    return {
      id: saved.id,
      recognizedSymptoms: aiResponse.recognized_symptoms,
      recommendations: aiResponse.recommendations,
      dangerAlert: aiResponse.danger_alert,
      engineVersion: aiResponse.engine_version,
      createdAt: saved.created_at,
    }
  }

  async getHistory(userId) {
    return this.recRepo.findByUser(userId)
  }

  async getById(id, userId) {
    const rec = await this.recRepo.findById(id, userId)
    if (!rec) throw new AppError('Không tìm thấy', 404, 'NOT_FOUND')
    return rec
  }
}

module.exports = RecommendationService
```

- [ ] **Bước 4: Tạo controllers và routes (gộp)**

```javascript
// backend/src/controllers/SymptomController.js
const ApiResponse = require('../utils/ApiResponse')
const SymptomRepository = require('../repositories/SymptomRepository')
const symptomRepo = new SymptomRepository()

exports.list = async (req, res, next) => {
  try {
    const symptoms = await symptomRepo.findAll()
    return ApiResponse.success(res, symptoms)
  } catch (err) { next(err) }
}
```

```javascript
// backend/src/routes/symptoms.js
const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middlewares/auth')
const { list } = require('../controllers/SymptomController')

router.get('/', verifyToken, list)
module.exports = router
```

```javascript
// backend/src/controllers/RecommendationController.js
const ApiResponse = require('../utils/ApiResponse')
const RecommendationRepository = require('../repositories/RecommendationRepository')
const RecommendationService = require('../services/RecommendationService')
const pool = require('../config/db')

const recRepo = new RecommendationRepository()
const recService = new RecommendationService(recRepo)

exports.create = async (req, res, next) => {
  try {
    const { symptomsText } = req.body
    if (!symptomsText || symptomsText.trim().length < 3)
      return ApiResponse.error(res, 'Vui lòng mô tả triệu chứng (tối thiểu 3 ký tự)', 400)
    const result = await recService.recommend({ userId: req.user.userId, symptomsText, pool })
    return ApiResponse.success(res, result, 'Gợi ý thuốc thành công', 201)
  } catch (err) { next(err) }
}

exports.history = async (req, res, next) => {
  try {
    const data = await recService.getHistory(req.user.userId)
    return ApiResponse.success(res, data)
  } catch (err) { next(err) }
}

exports.getOne = async (req, res, next) => {
  try {
    const data = await recService.getById(req.params.id, req.user.userId)
    return ApiResponse.success(res, data)
  } catch (err) { next(err) }
}
```

```javascript
// backend/src/routes/recommendations.js
const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middlewares/auth')
const { create, history, getOne } = require('../controllers/RecommendationController')

router.post('/',     verifyToken, create)
router.get('/',      verifyToken, history)
router.get('/:id',   verifyToken, getOne)
module.exports = router
```

- [ ] **Bước 5: Commit**

```bash
git add backend/src/
git commit -m "feat: add symptom and recommendation API endpoints"
```

---

## PHẦN C — AI Service (Nguyên)

### Task 7: Bootstrap AI Service

**Files:**
- Create: `ai-service/requirements.txt`
- Create: `ai-service/main.py`
- Create: `ai-service/models/schemas.py`

- [ ] **Bước 1: Tạo requirements.txt**

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
scikit-learn==1.3.2
numpy==1.26.2
python-dotenv==1.0.0
```

- [ ] **Bước 2: Tạo schemas.py**

```python
# ai-service/models/schemas.py
from pydantic import BaseModel
from typing import List, Optional

class RecommendRequest(BaseModel):
    symptoms_text: str
    history: List[str] = []
    medications: List[str] = []
    allergies: List[str] = []

class DrugRecommendation(BaseModel):
    drug_code: str
    drug_name: str
    active_ingredient: str
    confidence: float
    reason: str
    warnings: List[str] = []
    contraindications: List[str] = []

class RecognizedSymptom(BaseModel):
    code: str
    name_vi: str
    severity: Optional[str] = None

class RecommendResponse(BaseModel):
    recognized_symptoms: List[RecognizedSymptom]
    recommendations: List[DrugRecommendation]
    danger_alert: Optional[str] = None
    engine_version: str = "rule-based-v1"
```

- [ ] **Bước 3: Tạo main.py**

```python
# ai-service/main.py
from fastapi import FastAPI
from routers.recommend import router as recommend_router

app = FastAPI(title="MedAssist AI Service", version="1.0.0")

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(recommend_router, prefix="/ai")
```

- [ ] **Bước 4: Cài và test**

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
curl http://localhost:8000/health
# Expected: {"status":"ok"}
```

- [ ] **Bước 5: Commit**

```bash
git add ai-service/requirements.txt ai-service/main.py ai-service/models/
git commit -m "feat: bootstrap AI service with FastAPI"
```

---

### Task 8: NLP Mapper + Rule Engine

**Files:**
- Create: `ai-service/data/symptoms/symptoms.json`
- Create: `ai-service/data/drugs/drugs.json`
- Create: `ai-service/services/nlp_mapper.py`
- Create: `ai-service/services/rule_engine.py`
- Create: `ai-service/routers/recommend.py`

- [ ] **Bước 1: Tạo symptoms.json**

```json
[
  {"code":"sot","name_vi":"Sốt","name_en":"Fever","keywords":["sốt","nóng","nhiệt","38","39","40 độ"],"is_danger":false},
  {"code":"dau_dau","name_vi":"Đau đầu","name_en":"Headache","keywords":["đau đầu","nhức đầu","đầu đau"],"is_danger":false},
  {"code":"ho","name_vi":"Ho","name_en":"Cough","keywords":["ho","ho khan","ho có đờm","batuk"],"is_danger":false},
  {"code":"dau_hong","name_vi":"Đau họng","name_en":"Sore Throat","keywords":["đau họng","rát họng","khó nuốt","viêm họng"],"is_danger":false},
  {"code":"kho_tho","name_vi":"Khó thở","name_en":"Dyspnea","keywords":["khó thở","thở khó","hụt hơi","ngạt thở"],"is_danger":true},
  {"code":"dau_nguyen","name_vi":"Đau ngực","name_en":"Chest Pain","keywords":["đau ngực","tức ngực","nặng ngực","đau tim"],"is_danger":true},
  {"code":"sot_cao","name_vi":"Sốt cao","name_en":"High Fever","keywords":["sốt cao","40 độ","41 độ","sốt không hạ"],"is_danger":true},
  {"code":"biet_liet","name_vi":"Liệt tay/chân","name_en":"Paralysis","keywords":["tê liệt","không cử động được","liệt","yếu tay","yếu chân"],"is_danger":true},
  {"code":"buon_non","name_vi":"Buồn nôn","name_en":"Nausea","keywords":["buồn nôn","nôn","ói","muốn ói"],"is_danger":false},
  {"code":"dau_bung","name_vi":"Đau bụng","name_en":"Abdominal Pain","keywords":["đau bụng","đau dạ dày","bụng đau","quặn bụng"],"is_danger":false},
  {"code":"tieu_chay","name_vi":"Tiêu chảy","name_en":"Diarrhea","keywords":["tiêu chảy","đi ngoài","phân lỏng"],"is_danger":false},
  {"code":"met_moi","name_vi":"Mệt mỏi","name_en":"Fatigue","keywords":["mệt","mệt mỏi","uể oải","kiệt sức","không có sức"],"is_danger":false},
  {"code":"chong_mat","name_vi":"Chóng mặt","name_en":"Dizziness","keywords":["chóng mặt","hoa mắt","xây xẩm","choáng váng"],"is_danger":false},
  {"code":"so_mui","name_vi":"Sổ mũi","name_en":"Runny Nose","keywords":["sổ mũi","chảy mũi","nghẹt mũi","mũi đặc"],"is_danger":false},
  {"code":"ngua","name_vi":"Ngứa","name_en":"Itching","keywords":["ngứa","ngứa ngáy","ngứa da","nổi mẩn"],"is_danger":false}
]
```

- [ ] **Bước 2: Tạo drugs.json** (5 thuốc khớp với seed.sql)

```json
[
  {
    "code":"paracetamol_500","name_vi":"Paracetamol 500mg","active_ingredient":"Paracetamol",
    "drug_class":"Giảm đau - Hạ sốt",
    "warnings":["Không dùng quá 8 viên/ngày","Tránh dùng cùng rượu bia"],
    "contraindications":["Dị ứng paracetamol","Suy gan nặng"],
    "symptom_weights":{"sot":0.95,"dau_dau":0.80,"met_moi":0.40,"sot_cao":0.90}
  },
  {
    "code":"ibuprofen_400","name_vi":"Ibuprofen 400mg","active_ingredient":"Ibuprofen",
    "drug_class":"NSAIDs - Chống viêm - Giảm đau",
    "warnings":["Dùng sau khi ăn","Không dùng cho phụ nữ có thai trên 20 tuần"],
    "contraindications":["Loét dạ dày","Suy thận","Dị ứng NSAIDs"],
    "symptom_weights":{"sot":0.85,"dau_dau":0.90,"dau_hong":0.60,"dau_bung":0.30}
  },
  {
    "code":"amoxicillin_500","name_vi":"Amoxicillin 500mg","active_ingredient":"Amoxicillin",
    "drug_class":"Kháng sinh - Penicillin",
    "warnings":["Uống đủ liệu trình 7-10 ngày"],
    "contraindications":["Dị ứng penicillin","Dị ứng amoxicillin"],
    "symptom_weights":{"ho":0.70,"dau_hong":0.85,"sot":0.65,"met_moi":0.50}
  },
  {
    "code":"cetirizine_10","name_vi":"Cetirizine 10mg","active_ingredient":"Cetirizine HCl",
    "drug_class":"Kháng histamine",
    "warnings":["Có thể gây buồn ngủ","Không lái xe sau khi uống"],
    "contraindications":["Dị ứng cetirizine"],
    "symptom_weights":{"ngua":0.95,"so_mui":0.80,"ho":0.40}
  },
  {
    "code":"strepsils","name_vi":"Strepsils Đau Họng","active_ingredient":"Amylmetacresol",
    "drug_class":"Sát khuẩn tại chỗ",
    "warnings":["Không dùng cho trẻ dưới 6 tuổi"],
    "contraindications":[],
    "symptom_weights":{"dau_hong":0.90,"ho":0.55}
  }
]
```

- [ ] **Bước 3: Tạo nlp_mapper.py**

```python
# ai-service/services/nlp_mapper.py
import json, re
from pathlib import Path

_SYMPTOMS = json.loads((Path(__file__).parent.parent / "data/symptoms/symptoms.json").read_text(encoding="utf-8"))

def map_text_to_symptoms(text: str) -> list[dict]:
    """
    Nhận text tiếng Việt → trả về list symptom objects khớp.
    Dùng keyword matching đơn giản cho Sprint 2.
    """
    text_lower = text.lower().strip()
    matched = []
    seen_codes = set()

    for symptom in _SYMPTOMS:
        for kw in symptom["keywords"]:
            if kw.lower() in text_lower and symptom["code"] not in seen_codes:
                matched.append({
                    "code":    symptom["code"],
                    "name_vi": symptom["name_vi"],
                    "name_en": symptom["name_en"],
                    "is_danger": symptom["is_danger"],
                })
                seen_codes.add(symptom["code"])
                break

    return matched
```

- [ ] **Bước 4: Tạo rule_engine.py**

```python
# ai-service/services/rule_engine.py
import json
from pathlib import Path

_DRUGS = json.loads((Path(__file__).parent.parent / "data/drugs/drugs.json").read_text(encoding="utf-8"))

DANGER_SYMPTOMS = {"kho_tho", "dau_nguyen", "sot_cao", "biet_liet"}

DANGER_MESSAGES = {
    "kho_tho":   "Khó thở có thể là dấu hiệu của bệnh phổi hoặc tim mạch nghiêm trọng.",
    "dau_nguyen":"Đau ngực có thể là triệu chứng đau tim. Hãy đến cơ sở y tế ngay.",
    "sot_cao":   "Sốt cao kéo dài có thể là dấu hiệu nhiễm trùng nặng.",
    "biet_liet": "Tê liệt đột ngột có thể là dấu hiệu đột quỵ. Gọi 115 ngay!",
}

def recommend(symptom_codes: list[str], allergies: list[str]) -> dict:
    """
    Confidence = Σ(weight * match) / Σ(all weights for drug)
    Lọc thuốc bị dị ứng.
    Trả về list thuốc sorted by confidence DESC.
    """
    allergies_lower = [a.lower() for a in allergies]
    results = []

    for drug in _DRUGS:
        # Bỏ qua nếu trùng dị ứng
        if any(allergy in drug["active_ingredient"].lower() or
               allergy in drug["name_vi"].lower()
               for allergy in allergies_lower):
            continue

        weights = drug.get("symptom_weights", {})
        if not weights:
            continue

        total_weight = sum(weights.values())
        matched_weight = sum(weights[s] for s in symptom_codes if s in weights)

        if matched_weight == 0:
            continue

        confidence = round(matched_weight / total_weight, 2)

        # Tạo lý do gợi ý
        matched_names = [s for s in symptom_codes if s in weights]
        reason_parts = [f"khớp với triệu chứng: {', '.join(matched_names)}"]
        if allergies:
            reason_parts.append("không có trong danh sách dị ứng của bạn")

        results.append({
            "drug_code":         drug["code"],
            "drug_name":         drug["name_vi"],
            "active_ingredient": drug["active_ingredient"],
            "confidence":        confidence,
            "reason":            " | ".join(reason_parts),
            "warnings":          drug.get("warnings", []),
            "contraindications": drug.get("contraindications", []),
        })

    results.sort(key=lambda x: x["confidence"], reverse=True)

    # Kiểm tra triệu chứng nguy hiểm
    danger_alert = None
    for code in symptom_codes:
        if code in DANGER_SYMPTOMS:
            danger_alert = (
                "⚠️ Triệu chứng của bạn có thể nguy hiểm. "
                + DANGER_MESSAGES.get(code, "Vui lòng đến cơ sở y tế ngay.")
                + " Thông tin gợi ý dưới đây chỉ mang tính tham khảo."
            )
            break

    return {"recommendations": results[:5], "danger_alert": danger_alert}
```

- [ ] **Bước 5: Tạo routers/recommend.py**

```python
# ai-service/routers/recommend.py
from fastapi import APIRouter, HTTPException
from models.schemas import RecommendRequest, RecommendResponse, RecognizedSymptom, DrugRecommendation
from services.nlp_mapper import map_text_to_symptoms
from services.rule_engine import recommend

router = APIRouter()

@router.post("/recommend", response_model=RecommendResponse)
def get_recommendation(body: RecommendRequest):
    if not body.symptoms_text.strip():
        raise HTTPException(status_code=422, detail="symptoms_text không được trống")

    recognized_raw = map_text_to_symptoms(body.symptoms_text)

    if not recognized_raw:
        return RecommendResponse(
            recognized_symptoms=[],
            recommendations=[],
            danger_alert=None,
            engine_version="rule-based-v1"
        )

    symptom_codes = [s["code"] for s in recognized_raw]
    engine_result = recommend(symptom_codes, body.allergies)

    return RecommendResponse(
        recognized_symptoms=[RecognizedSymptom(**s) for s in recognized_raw],
        recommendations=[DrugRecommendation(**d) for d in engine_result["recommendations"]],
        danger_alert=engine_result["danger_alert"],
        engine_version="rule-based-v1"
    )
```

- [ ] **Bước 6: Test endpoint**

```bash
cd ai-service && uvicorn main:app --reload --port 8000

curl -X POST http://localhost:8000/ai/recommend \
  -H "Content-Type: application/json" \
  -d '{"symptoms_text":"tôi bị sốt và đau đầu","history":[],"medications":[],"allergies":[]}'

# Expected: JSON với recommendations: [paracetamol, ibuprofen], confidence > 0
```

- [ ] **Bước 7: Commit**

```bash
git add ai-service/
git commit -m "feat: add AI rule-based engine with NLP symptom mapper"
```

---

## PHẦN D — Frontend (Khoa)

### Task 9: AuthContext + Routing

**Files:**
- Create: `frontend/src/contexts/AuthContext.jsx`
- Create: `frontend/src/hooks/useAuth.js`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/services/api.js` — thêm auth/symptom/rec calls

- [ ] **Bước 1: Tạo AuthContext.jsx**

```jsx
// frontend/src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password })
    localStorage.setItem('accessToken', data.data.accessToken)
    localStorage.setItem('refreshToken', data.data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.data.user))
    setUser(data.data.user)
    return data.data.user
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    try { await api.post('/api/auth/logout', { refreshToken }) } catch {}
    localStorage.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

- [ ] **Bước 2: Tạo App.jsx với routing**

```jsx
// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OTPVerifyPage from './pages/OTPVerifyPage'
import DashboardPage from './pages/DashboardPage'
import SymptomInputPage from './pages/SymptomInputPage'
import ResultsPage from './pages/ResultsPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"       element={<LoginPage />} />
          <Route path="/register"    element={<RegisterPage />} />
          <Route path="/verify-otp"  element={<OTPVerifyPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/symptoms"    element={<ProtectedRoute><SymptomInputPage /></ProtectedRoute>} />
          <Route path="/results/:id" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
```

- [ ] **Bước 3: Thêm API calls vào api.js**

Thêm vào cuối `frontend/src/services/api.js`:

```javascript
// Auth
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  verifyOTP: (data) => api.post('/api/auth/verify-otp', data),
  login: (data) => api.post('/api/auth/login', data),
  logout: (data) => api.post('/api/auth/logout', data),
  refresh: (data) => api.post('/api/auth/refresh', data),
}

// Symptoms
export const symptomAPI = {
  list: () => api.get('/api/symptoms'),
}

// Recommendations
export const recommendationAPI = {
  create: (symptomsText) => api.post('/api/recommendations', { symptomsText }),
  history: () => api.get('/api/recommendations'),
  getOne: (id) => api.get(`/api/recommendations/${id}`),
}

export default api
```

- [ ] **Bước 4: Commit**

```bash
git add frontend/src/contexts/ frontend/src/App.jsx frontend/src/services/api.js
git commit -m "feat: add AuthContext, routing, and API service calls"
```

---

### Task 10: Auth Pages (Login, Register, OTP)

**Files:**
- Create: `frontend/src/pages/LoginPage.jsx`
- Create: `frontend/src/pages/RegisterPage.jsx`
- Create: `frontend/src/pages/OTPVerifyPage.jsx`

- [ ] **Bước 1: Tạo LoginPage.jsx**

```jsx
// frontend/src/pages/LoginPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2 text-blue-600">MedAssist AI</h1>
        <p className="text-center text-gray-500 mb-6 text-sm">Gợi ý thuốc thông minh</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" required
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input
              type="password" required
              value={form.password}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-medium">Đăng ký</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Bước 2: Tạo RegisterPage.jsx**

```jsx
// frontend/src/pages/RegisterPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) return setError('Mật khẩu tối thiểu 8 ký tự')
    setLoading(true)
    setError('')
    try {
      await authAPI.register(form)
      navigate('/verify-otp', { state: { email: form.email } })
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">Tạo tài khoản</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: 'fullName', label: 'Họ và tên', type: 'text', placeholder: 'Nguyễn Văn A' },
            { name: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' },
            { name: 'password', label: 'Mật khẩu', type: 'password', placeholder: 'Tối thiểu 8 ký tự' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input
                type={f.type} required
                value={form[f.name]}
                onChange={(e) => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={f.placeholder}
              />
            </div>
          ))}
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Đã có tài khoản? <Link to="/login" className="text-blue-600 hover:underline">Đăng nhập</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Bước 3: Tạo OTPVerifyPage.jsx**

```jsx
// frontend/src/pages/OTPVerifyPage.jsx
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function OTPVerifyPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await authAPI.verifyOTP({ email, code })
      localStorage.setItem('accessToken', data.data.accessToken)
      localStorage.setItem('refreshToken', data.data.refreshToken)
      localStorage.setItem('user', JSON.stringify(data.data.user))
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Mã OTP không đúng')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-xl font-bold mb-2">Xác thực email</h1>
        <p className="text-gray-500 text-sm mb-6">
          Mã OTP 6 số đã được gửi đến <strong>{email}</strong>
        </p>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text" maxLength={6} required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-blue-500 mb-4"
            placeholder="000000"
          />
          <button
            type="submit" disabled={loading || code.length !== 6}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Đang xác thực...' : 'Xác nhận'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Bước 4: Chạy frontend và kiểm tra**

```bash
cd frontend && npm run dev
# Mở http://localhost:3000/register
# Điền form → submit → phải redirect đến /verify-otp
```

- [ ] **Bước 5: Commit**

```bash
git add frontend/src/pages/LoginPage.jsx frontend/src/pages/RegisterPage.jsx frontend/src/pages/OTPVerifyPage.jsx
git commit -m "feat: add login, register, and OTP verification pages"
```

---

### Task 11: Symptom Input + Results Pages

**Files:**
- Create: `frontend/src/pages/DashboardPage.jsx`
- Create: `frontend/src/pages/SymptomInputPage.jsx`
- Create: `frontend/src/pages/ResultsPage.jsx`
- Create: `frontend/src/components/symptoms/DangerAlert.jsx`
- Create: `frontend/src/components/symptoms/SeverityPicker.jsx`
- Modify: `frontend/src/components/symptoms/DrugCard.jsx`

- [ ] **Bước 1: Tạo DangerAlert.jsx**

```jsx
// frontend/src/components/symptoms/DangerAlert.jsx
export default function DangerAlert({ message }) {
  if (!message) return null
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <p className="font-semibold text-red-700 mb-1">Cảnh báo y tế</p>
          <p className="text-red-600 text-sm">{message}</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Bước 2: Cập nhật DrugCard.jsx để hiển thị reason và confidence**

```jsx
// frontend/src/components/symptoms/DrugCard.jsx
export default function DrugCard({ drug, isAllergy = false }) {
  const confidencePct = Math.round(drug.confidence * 100)
  const confidenceColor = confidencePct >= 80 ? 'bg-green-500' : confidencePct >= 50 ? 'bg-yellow-500' : 'bg-red-400'

  return (
    <div className={`bg-white rounded-xl border p-5 shadow-sm ${isAllergy ? 'border-red-300 opacity-75' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{drug.drug_name}</h3>
          <p className="text-xs text-gray-500">{drug.active_ingredient}</p>
        </div>
        {isAllergy && <span className="shrink-0 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">DỊ ỨNG</span>}
      </div>

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Độ phù hợp</span>
          <span className="font-medium">{confidencePct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${confidenceColor} rounded-full transition-all`} style={{ width: `${confidencePct}%` }} />
        </div>
      </div>

      {/* Reason */}
      {drug.reason && (
        <div className="bg-blue-50 rounded-lg p-3 mb-3 text-xs text-blue-700">
          <span className="font-medium">Lý do gợi ý: </span>{drug.reason}
        </div>
      )}

      {/* Warnings */}
      {drug.warnings?.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-orange-600 mb-1">⚠️ Lưu ý:</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {drug.warnings.map((w, i) => <li key={i}>• {w}</li>)}
          </ul>
        </div>
      )}

      {/* Contraindications */}
      {drug.contraindications?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-red-600 mb-1">🚫 Chống chỉ định:</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {drug.contraindications.map((c, i) => <li key={i}>• {c}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Bước 3: Tạo SymptomInputPage.jsx**

```jsx
// frontend/src/pages/SymptomInputPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { recommendationAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function SymptomInputPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (text.trim().length < 3) return setError('Vui lòng mô tả triệu chứng (tối thiểu 3 ký tự)')
    setLoading(true)
    setError('')
    try {
      const { data } = await recommendationAPI.create(text)
      navigate(`/results/${data.data.id}`, { state: { result: data.data } })
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể kết nối hệ thống. Thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-blue-600 text-lg">MedAssist AI</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">{user?.fullName}</span>
          <button onClick={logout} className="text-gray-400 hover:text-red-500 transition">Đăng xuất</button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto py-10 px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mô tả triệu chứng của bạn</h1>
          <p className="text-gray-500 text-sm mb-6">
            Viết tự nhiên bằng tiếng Việt. Ví dụ: <em>"Tôi bị sốt cao, đau đầu và mệt mỏi từ hôm qua"</em>
          </p>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

          <form onSubmit={handleSubmit}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              maxLength={500}
              className="w-full border border-gray-300 rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              placeholder="Mô tả triệu chứng của bạn ở đây..."
            />
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-gray-400">{text.length}/500</span>
            </div>

            <button
              type="submit" disabled={loading || text.trim().length < 3}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="animate-spin">⏳</span> Đang phân tích...</>
              ) : (
                <><span>🔍</span> Tìm thuốc phù hợp</>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            ⚕️ Kết quả chỉ mang tính tham khảo, không thay thế tư vấn bác sĩ
          </p>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Bước 4: Tạo ResultsPage.jsx**

```jsx
// frontend/src/pages/ResultsPage.jsx
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DrugCard from '../components/symptoms/DrugCard'
import DangerAlert from '../components/symptoms/DangerAlert'

export default function ResultsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const result = location.state?.result
  const [showFiltered, setShowFiltered] = useState(false)

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Không tìm thấy kết quả</p>
          <button onClick={() => navigate('/symptoms')} className="text-blue-600 hover:underline">
            Quay lại tra cứu
          </button>
        </div>
      </div>
    )
  }

  const { recognizedSymptoms, recommendations, dangerAlert } = result

  // Phân loại thuốc (trong Sprint 2, backend đã lọc, không có allergy drugs trong list)
  const safeDrugs = recommendations || []

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-blue-600 text-lg">MedAssist AI</span>
        <button onClick={() => navigate('/symptoms')} className="text-sm text-gray-500 hover:text-blue-600">
          ← Tra cứu mới
        </button>
      </nav>

      <main className="max-w-2xl mx-auto py-8 px-4">
        {/* Danger Alert */}
        <DangerAlert message={dangerAlert} />

        {/* Triệu chứng đã nhận diện */}
        {recognizedSymptoms?.length > 0 && (
          <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
            <p className="text-sm font-medium text-gray-600 mb-2">Triệu chứng AI đã nhận diện:</p>
            <div className="flex flex-wrap gap-2">
              {recognizedSymptoms.map(s => (
                <span key={s.code} className={`px-3 py-1 rounded-full text-xs font-medium ${s.is_danger ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {s.name_vi}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Kết quả */}
        <h2 className="font-semibold text-gray-700 mb-3">
          Gợi ý thuốc ({safeDrugs.length} kết quả)
        </h2>

        {safeDrugs.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <p className="text-gray-400 text-4xl mb-3">🤔</p>
            <p className="text-gray-600 font-medium">Không tìm thấy thuốc phù hợp</p>
            <p className="text-gray-400 text-sm mt-1">Thử mô tả chi tiết hơn hoặc đến gặp bác sĩ</p>
          </div>
        ) : (
          <div className="space-y-4">
            {safeDrugs.map((drug) => (
              <DrugCard key={drug.drug_code} drug={drug} />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-gray-100 rounded-xl text-xs text-gray-500 text-center">
          <strong>Tuyên bố miễn trách nhiệm:</strong> Thông tin trên chỉ mang tính tham khảo và không thay thế
          cho tư vấn y tế chuyên nghiệp. Luôn hỏi ý kiến bác sĩ hoặc dược sĩ trước khi dùng thuốc.
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Bước 5: Tạo DashboardPage.jsx**

```jsx
// frontend/src/pages/DashboardPage.jsx
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-blue-600 text-lg">MedAssist AI</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">{user?.fullName}</span>
          <button onClick={logout} className="text-gray-400 hover:text-red-500 transition">Đăng xuất</button>
        </div>
      </nav>

      <main className="max-w-xl mx-auto py-16 px-4 text-center">
        <p className="text-4xl mb-4">🏥</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Xin chào, {user?.fullName}!
        </h1>
        <p className="text-gray-500 mb-8">Hãy mô tả triệu chứng để nhận gợi ý thuốc phù hợp</p>
        <button
          onClick={() => navigate('/symptoms')}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
        >
          🔍 Tra cứu thuốc
        </button>
      </main>
    </div>
  )
}
```

- [ ] **Bước 6: Chạy thử frontend**

```bash
cd frontend && npm run dev
# Kiểm tra flow:
# 1. http://localhost:3000/register → điền form
# 2. redirect đến /verify-otp → nhập OTP từ email
# 3. redirect đến / (Dashboard)
# 4. nhấn "Tra cứu thuốc" → /symptoms
# 5. nhập "tôi bị sốt và đau đầu" → submit
# 6. phải nhận được kết quả từ AI với Paracetamol và Ibuprofen
```

- [ ] **Bước 7: Commit**

```bash
git add frontend/src/pages/ frontend/src/components/symptoms/DrugCard.jsx frontend/src/components/symptoms/DangerAlert.jsx
git commit -m "feat: add symptom input, results, and dashboard pages"
```

---

## PHẦN E — Integration & Verification (Tiến)

### Task 12: End-to-End Test + Staging Deploy

- [ ] **Bước 1: Tạo .env cho cả 3 service**

Backend `backend/.env` (không commit):
```env
PORT=5000
DATABASE_URL=<supabase_url>
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=medassist_access_secret_sprint2
JWT_REFRESH_SECRET=medassist_refresh_secret_sprint2
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<team_gmail>
SMTP_PASS=<app_password>
MAIL_FROM=MedAssist <noreply@medassist.app>
AI_SERVICE_URL=http://localhost:8000
NODE_ENV=development
```

Frontend `frontend/.env.local` (không commit):
```env
VITE_API_URL=http://localhost:5000
```

- [ ] **Bước 2: Chạy cả 3 service**

Terminal 1 (Backend):
```bash
cd backend && npm run dev
# Verify: curl http://localhost:5000/health → {"status":"ok"}
```

Terminal 2 (AI Service):
```bash
cd ai-service && uvicorn main:app --reload --port 8000
# Verify: curl http://localhost:8000/health → {"status":"ok"}
```

Terminal 3 (Frontend):
```bash
cd frontend && npm run dev
# Verify: http://localhost:3000 → redirect đến /login
```

- [ ] **Bước 3: Test end-to-end manually**

```
1. Đăng ký: POST /api/auth/register
   → nhận OTP trong email

2. Xác thực OTP: POST /api/auth/verify-otp
   → nhận accessToken + refreshToken

3. Lấy symptoms: GET /api/symptoms
   Header: Authorization: Bearer <accessToken>
   → danh sách 5 triệu chứng

4. Gợi ý thuốc: POST /api/recommendations
   Body: {"symptomsText":"tôi bị sốt cao và đau đầu"}
   → nhận {recommendations: [paracetamol, ibuprofen, ...]}

5. Lịch sử: GET /api/recommendations
   → list các lần tra cứu trong 30 ngày
```

- [ ] **Bước 4: Viết test tóm tắt kết quả**

Tạo file `docs/testing/sprint2-e2e-results.md` với kết quả test.

- [ ] **Bước 5: Final commit**

```bash
git add .
git commit -m "feat: Sprint 2 complete — auth + symptom input + drug recommendation end-to-end"
```

---

## Self-Review

**Spec coverage check:**
- [x] F01 Đăng ký — Task 4, 5
- [x] F02 Đăng nhập — Task 5
- [x] F04 Nhập triệu chứng tự do — Task 11
- [x] F05 Gợi ý thuốc AI — Task 8
- [x] F06 Explainable AI (lý do) — Task 8, DrugCard
- [x] F07 Cảnh báo nguy hiểm — Task 8, DangerAlert
- [x] F10 Lọc dị ứng — Task 8 rule_engine
- [x] F12 Lịch sử 30 ngày — Task 6
- [ ] F08 Tiền sử bệnh CRUD — Sprint 3
- [ ] F09 Quản lý dị ứng — Sprint 3
- [ ] F13 Export PDF — Sprint 3
- [ ] F14/15 Admin Panel — Sprint 3/4

**Spec items intentionally deferred to Sprint 3:** F08, F09, F13, F14, F15, F17, F18, F19 (dark mode, i18n).
