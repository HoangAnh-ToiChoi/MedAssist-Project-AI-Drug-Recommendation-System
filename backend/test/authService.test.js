const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')

process.env.JWT_SECRET = 'test-secret'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
process.env.JWT_EXPIRES_IN = '15m'
process.env.JWT_REFRESH_EXPIRES_IN = '7d'
process.env.NODE_ENV = 'test'

const AuthService = require('../src/services/authService')
const AppError = require('../src/utils/AppError')
const User = require('../src/entities/User')

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

const createRedisMock = () => {
  const store = new Map()

  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null
    },
    async setEx(key, ttl, value) {
      store.set(key, value)
    },
    async del(key) {
      store.delete(key)
    },
  }
}

const createUserRepoMock = () => {
  const users = new Map()

  return {
    async findByEmail(email) {
      const user = users.get(email)
      return user?.isActive ? user : null
    },
    async findByEmailIncludingInactive(email) {
      return users.get(email) ?? null
    },
    async findById(id) {
      for (const user of users.values()) {
        if (user.id === id && user.isActive) return user
      }

      return null
    },
    async save(user) {
      if (!user.id) {
        user.id = `user-${users.size + 1}`
      }

      users.set(user.email, user)
      return user
    },
  }
}

const createRefreshTokenRepoMock = () => {
  const tokens = new Map()

  return {
    async save({ userId, tokenHash, expiresAt }) {
      tokens.set(tokenHash, {
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        revoked: false,
      })
    },
    async findActiveByTokenHash(tokenHash) {
      const token = tokens.get(tokenHash)
      if (!token || token.revoked) return null
      if (new Date(token.expires_at).getTime() <= Date.now()) return null
      return token
    },
    async revokeByTokenHash(tokenHash) {
      const token = tokens.get(tokenHash)
      if (!token || token.revoked) return false
      token.revoked = true
      return true
    },
    async revokeAllByUserId(userId) {
      for (const token of tokens.values()) {
        if (token.user_id === userId) {
          token.revoked = true
        }
      }
    },
  }
}

// Helper: tạo service với fresh mocks
const createService = () => {
  const userRepo = createUserRepoMock()
  const refreshTokenRepo = createRefreshTokenRepoMock()
  const redis = createRedisMock()
  const mailer = { sendMail: async () => {} }
  const service = new AuthService(userRepo, refreshTokenRepo, redis, mailer)
  return { service, userRepo, refreshTokenRepo, redis }
}

// Helper: tạo và lưu active user
const createActiveUser = async (userRepo, { id = 'user-1', email, fullName = 'Test User', password = 'Password123' } = {}) => {
  const user = new User({ id, email, fullName, isActive: true })
  await user.changePassword(password, bcrypt)
  await userRepo.save(user)
  return user
}

// Helper: tạo và lưu pending (chưa verify OTP) user
const createPendingUser = async (userRepo, { id = 'user-pending', email, fullName = 'Pending User', password = 'Password123' } = {}) => {
  const user = new User({ id, email, fullName, isActive: false })
  await user.changePassword(password, bcrypt)
  await userRepo.save(user)
  return user
}

// ---------------------------------------------------------------------------
// REGISTER
// ---------------------------------------------------------------------------

test('[register] normalizes email and creates pending user requiring OTP verification', async () => {
  const { service, userRepo } = createService()

  const result = await service.register(' Pending@Example.com ', 'Password123!', 'Pending User')
  const savedUser = await userRepo.findByEmailIncludingInactive('pending@example.com')

  assert.equal(result.requiresVerification, true)
  assert.equal(savedUser.email, 'pending@example.com')
  assert.equal(savedUser.isActive, false)
})

test('[register] throws 409 EMAIL_ALREADY_EXISTS when active user registers with same email', async () => {
  const { service, userRepo } = createService()
  await createActiveUser(userRepo, { email: 'dup@example.com' })

  await assert.rejects(
    service.register('dup@example.com', 'Password123!', 'Dup User'),
    (err) => err instanceof AppError && err.code === 'EMAIL_ALREADY_EXISTS' && err.statusCode === 409
  )
})

// ---------------------------------------------------------------------------
// LOGIN — CHCKNSPC-110: Anti User Enumeration
// ---------------------------------------------------------------------------

test('[login][OWASP V2.7] returns 401 INVALID_CREDENTIALS with generic message when email does not exist', async () => {
  const { service } = createService()

  await assert.rejects(
    service.login('ghost@example.com', 'SomePassword1'),
    (err) => {
      assert.ok(err instanceof AppError, 'Phải là AppError')
      assert.equal(err.statusCode, 401, 'HTTP status phải là 401')
      assert.equal(err.code, 'INVALID_CREDENTIALS', 'Error code phải là INVALID_CREDENTIALS')
      assert.equal(err.message, 'Email hoặc mật khẩu không đúng', 'Message phải là generic')
      return true
    }
  )
})

test('[login][OWASP V2.7] returns 401 INVALID_CREDENTIALS (NOT 403) when email exists but account is pending OTP', async () => {
  const { service, userRepo } = createService()

  // Tạo pending account (chưa verify OTP) — đây là điểm leak cũ bị vá
  await createPendingUser(userRepo, { email: 'pending@example.com' })

  await assert.rejects(
    service.login('pending@example.com', 'Password123'),
    (err) => {
      assert.ok(err instanceof AppError, 'Phải là AppError')
      // KHÔNG được là 403 ACCOUNT_NOT_VERIFIED — sẽ leak thông tin email tồn tại
      assert.notEqual(err.statusCode, 403, 'Không được trả 403 (tiết lộ pending status)')
      assert.notEqual(err.code, 'ACCOUNT_NOT_VERIFIED', 'Không được dùng code ACCOUNT_NOT_VERIFIED')
      assert.equal(err.statusCode, 401, 'Phải là 401 generic')
      assert.equal(err.code, 'INVALID_CREDENTIALS', 'Phải là INVALID_CREDENTIALS')
      assert.equal(err.message, 'Email hoặc mật khẩu không đúng', 'Message phải là generic')
      return true
    }
  )
})

test('[login][OWASP V2.7] returns 401 INVALID_CREDENTIALS with generic message when password is wrong', async () => {
  const { service, userRepo } = createService()
  await createActiveUser(userRepo, { email: 'user@example.com' })

  await assert.rejects(
    service.login('user@example.com', 'WrongPassword1'),
    (err) => {
      assert.ok(err instanceof AppError)
      assert.equal(err.statusCode, 401)
      assert.equal(err.code, 'INVALID_CREDENTIALS')
      assert.equal(err.message, 'Email hoặc mật khẩu không đúng')
      return true
    }
  )
})

test('[login] returns tokens on successful login with correct credentials', async () => {
  const { service, userRepo } = createService()
  await createActiveUser(userRepo, { email: 'ok@example.com', password: 'Password123' })

  const result = await service.login('ok@example.com', 'Password123')

  assert.ok(result.accessToken, 'Phải có accessToken')
  assert.ok(result.refreshToken, 'Phải có refreshToken')
  assert.equal(result.user.email, 'ok@example.com')
})

test('[login] locks account after 5 failed attempts and returns 423', async () => {
  const { service, userRepo } = createService()
  await createActiveUser(userRepo, { email: 'lock@example.com' })

  // 4 lần sai → INVALID_CREDENTIALS
  for (let attempt = 1; attempt < 5; attempt += 1) {
    await assert.rejects(
      service.login('lock@example.com', 'wrong-password'),
      (err) => err.code === 'INVALID_CREDENTIALS'
    )
  }

  // Lần 5 → trigger lock
  await assert.rejects(
    service.login('lock@example.com', 'wrong-password'),
    (err) => err.code === 'ACCOUNT_TEMPORARILY_LOCKED' && err.statusCode === 423
  )

  // Ngay cả đúng password cũng bị chặn khi đang locked
  await assert.rejects(
    service.login('lock@example.com', 'Password123'),
    (err) => err.code === 'ACCOUNT_TEMPORARILY_LOCKED'
  )
})

// ---------------------------------------------------------------------------
// VERIFY OTP
// ---------------------------------------------------------------------------

test('[verifyOtp] activates pending user and returns token pair', async () => {
  const { service, userRepo, redis } = createService()

  const user = new User({ id: 'user-1', email: 'verify@example.com', fullName: 'Verify User', isActive: false })
  await user.changePassword('Password123', bcrypt)
  await userRepo.save(user)
  await redis.setEx('otp:verify@example.com', 600, '123456')

  const tokens = await service.verifyOtp('verify@example.com', '123456')
  const savedUser = await userRepo.findByEmail('verify@example.com')

  assert.ok(tokens.accessToken)
  assert.ok(tokens.refreshToken)
  assert.equal(savedUser.isActive, true)
  assert.equal(await redis.get('otp:verify@example.com'), null, 'OTP key phải bị xóa sau verify thành công')
})

test('[verifyOtp] blocks with 429 OTP_ATTEMPTS_EXCEEDED after 3 failed attempts', async () => {
  const { service, redis } = createService()
  await redis.setEx('otp:test@example.com', 600, '123456')

  await assert.rejects(service.verifyOtp('test@example.com', '000000'), (err) => err.code === 'INVALID_OTP')
  await assert.rejects(service.verifyOtp('test@example.com', '000000'), (err) => err.code === 'INVALID_OTP')
  await assert.rejects(
    service.verifyOtp('test@example.com', '000000'),
    (err) => err.code === 'OTP_ATTEMPTS_EXCEEDED' && err.statusCode === 429
  )

  // OTP key phải bị xóa sau khi vượt giới hạn
  assert.equal(await redis.get('otp:test@example.com'), null)
})

// ---------------------------------------------------------------------------
// FORGOT PASSWORD — CHCKNSPC-110: Anti User Enumeration
// ---------------------------------------------------------------------------

test('[forgotPassword][OWASP V2.7] returns HTTP 200 with generic message when email does NOT exist (no 404 leak)', async () => {
  const { service } = createService()

  // Không throw, không 404 — phải resolve thành công
  const result = await service.forgotPassword('nonexistent@example.com')

  assert.ok(result, 'Phải trả về object (không phải void/undefined)')
  assert.ok(typeof result.message === 'string', 'Phải có trường message kiểu string')
  assert.equal(
    result.message,
    'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đi.',
    'Message phải là generic OWASP-compliant'
  )
})

test('[forgotPassword][OWASP V2.7] returns SAME generic message when email DOES exist', async () => {
  const { service, userRepo } = createService()
  await createActiveUser(userRepo, { email: 'real@example.com' })

  const result = await service.forgotPassword('real@example.com')

  assert.ok(result, 'Phải trả về object')
  assert.equal(
    result.message,
    'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đi.',
    'Message phải giống hệt khi email không tồn tại'
  )
})

test('[forgotPassword][OWASP V2.7] message is identical regardless of email existence (no timing difference in message)', async () => {
  const { service, userRepo } = createService()
  await createActiveUser(userRepo, { email: 'exists@example.com' })

  const resultExists = await service.forgotPassword('exists@example.com')
  const resultNotExists = await service.forgotPassword('notexists@example.com')

  assert.equal(
    resultExists.message,
    resultNotExists.message,
    'Message PHẢI giống nhau dù email có tồn tại hay không — ngăn User Enumeration'
  )
})

// ---------------------------------------------------------------------------
// RESET PASSWORD
// ---------------------------------------------------------------------------

test('[resetPassword] changes password and revokes active refresh token via Redis key deletion', async () => {
  const { service, userRepo, redis } = createService()
  await createActiveUser(userRepo, { id: 'user-1', email: 'reset@example.com' })

  // Login để lấy token hợp lệ mới nhất
  // Ghi chú: Redis chỉ lưu 1 refresh token per user (ghi đè) — đây là thiết kế của hệ thống
  const { refreshToken: latestToken } = await service.login('reset@example.com', 'Password123')

  // Verify token đang hợp lệ trước khi reset
  const beforeReset = await redis.get('refresh:user-1')
  assert.equal(beforeReset, latestToken, 'Token phải tồn tại trong Redis trước resetPassword')

  // Thực hiện reset password
  await redis.setEx('reset:reset-token', 900, 'user-1')
  await service.resetPassword('reset-token', 'NewPassword123!')

  // Sau resetPassword, Redis key refresh:user-1 phải bị xóa (revokeAllByUserId xóa DB, Redis key bị rotate)
  // Token cũ phải bị từ chối
  await assert.rejects(
    service.refreshToken(latestToken),
    (err) => err.code === 'INVALID_REFRESH_TOKEN',
    'Token cũ phải bị vô hiệu sau resetPassword'
  )
})

test('[resetPassword] throws 400 TOKEN_EXPIRED_OR_INVALID when token is invalid', async () => {
  const { service } = createService()

  await assert.rejects(
    service.resetPassword('invalid-token-xyz', 'NewPassword123!'),
    (err) => err instanceof AppError && err.code === 'TOKEN_EXPIRED_OR_INVALID' && err.statusCode === 400
  )
})

// ---------------------------------------------------------------------------
// REFRESH TOKEN
// ---------------------------------------------------------------------------

test('[refreshToken] rotates token pair and invalidates old refresh token', async () => {
  const { service, userRepo } = createService()
  await createActiveUser(userRepo, { email: 'refresh@example.com' })

  const loginResult = await service.login('refresh@example.com', 'Password123')
  const rotatedResult = await service.refreshToken(loginResult.refreshToken)

  assert.ok(rotatedResult.accessToken, 'Phải có accessToken mới')
  assert.ok(rotatedResult.refreshToken, 'Phải có refreshToken mới')
  assert.notEqual(rotatedResult.refreshToken, loginResult.refreshToken, 'refreshToken mới phải khác cũ')

  // Token cũ phải bị vô hiệu sau rotation
  await assert.rejects(
    service.refreshToken(loginResult.refreshToken),
    (err) => err.code === 'INVALID_REFRESH_TOKEN'
  )
})

test('[refreshToken] throws 401 INVALID_REFRESH_TOKEN for malformed token', async () => {
  const { service } = createService()

  await assert.rejects(
    service.refreshToken('not.a.valid.jwt'),
    (err) => err instanceof AppError && err.code === 'INVALID_REFRESH_TOKEN' && err.statusCode === 401
  )
})

// ---------------------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------------------

test('[logout] succeeds and invalidates the refresh token', async () => {
  const { service, userRepo, redis } = createService()
  await createActiveUser(userRepo, { id: 'user-1', email: 'logout@example.com' })

  const { refreshToken } = await service.login('logout@example.com', 'Password123')

  // Logout phải resolve mà không throw
  await assert.doesNotReject(service.logout(refreshToken))

  // Sau logout, refresh token cũ phải bị vô hiệu
  await assert.rejects(
    service.refreshToken(refreshToken),
    (err) => err.code === 'INVALID_REFRESH_TOKEN'
  )

  // Verify Redis key bị xóa
  assert.equal(await redis.get('refresh:user-1'), null, 'Redis key phải bị xóa sau logout')
})

test('[logout] does NOT throw when given an invalid/malformed token (graceful degradation)', async () => {
  const { service } = createService()

  // Token sai chữ ký hoàn toàn — phải im lặng (không throw)
  await assert.doesNotReject(service.logout('completely.invalid.token'))
})
