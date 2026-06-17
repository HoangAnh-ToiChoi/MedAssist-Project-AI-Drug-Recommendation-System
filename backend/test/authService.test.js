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

test('register normalizes email, creates pending user and login is blocked until OTP verification', async () => {
  const userRepo = createUserRepoMock()
  const refreshTokenRepo = createRefreshTokenRepoMock()
  const redis = createRedisMock()
  const mailer = { sendMail: async () => {} }
  const service = new AuthService(userRepo, refreshTokenRepo, redis, mailer)

  const result = await service.register(' Pending@Example.com ', 'Password123', 'Pending User')
  const savedUser = await userRepo.findByEmailIncludingInactive('pending@example.com')

  assert.equal(result.requiresVerification, true)
  assert.equal(savedUser.email, 'pending@example.com')
  assert.equal(savedUser.isActive, false)

  await assert.rejects(
    service.login('pending@example.com', 'Password123'),
    (error) => error instanceof AppError && error.code === 'ACCOUNT_NOT_VERIFIED'
  )
})

test('verifyOtp activates pending user and returns tokens', async () => {
  const userRepo = createUserRepoMock()
  const refreshTokenRepo = createRefreshTokenRepoMock()
  const redis = createRedisMock()
  const mailer = { sendMail: async () => {} }
  const service = new AuthService(userRepo, refreshTokenRepo, redis, mailer)

  const user = new User({
    id: 'user-1',
    email: 'verify@example.com',
    fullName: 'Verify User',
    isActive: false,
  })

  await user.changePassword('Password123', bcrypt)
  await userRepo.save(user)
  await redis.setEx('otp:verify@example.com', 600, '123456')

  const tokens = await service.verifyOtp('verify@example.com', '123456')
  const savedUser = await userRepo.findByEmail('verify@example.com')

  assert.ok(tokens.accessToken)
  assert.ok(tokens.refreshToken)
  assert.equal(savedUser.isActive, true)
  assert.equal(await redis.get('otp:verify@example.com'), null)
})

test('verifyOtp blocks after too many failed attempts', async () => {
  const userRepo = createUserRepoMock()
  const refreshTokenRepo = createRefreshTokenRepoMock()
  const redis = createRedisMock()
  const mailer = { sendMail: async () => {} }
  const service = new AuthService(userRepo, refreshTokenRepo, redis, mailer)

  await redis.setEx('otp:test@example.com', 600, '123456')

  await assert.rejects(
    service.verifyOtp('test@example.com', '000000'),
    (error) => error.code === 'INVALID_OTP'
  )

  await assert.rejects(
    service.verifyOtp('test@example.com', '000000'),
    (error) => error.code === 'INVALID_OTP'
  )

  await assert.rejects(
    service.verifyOtp('test@example.com', '000000'),
    (error) => error.code === 'OTP_ATTEMPTS_EXCEEDED' && error.statusCode === 429
  )

  assert.equal(await redis.get('otp:test@example.com'), null)
})

test('login locks account after too many failed attempts', async () => {
  const userRepo = createUserRepoMock()
  const refreshTokenRepo = createRefreshTokenRepoMock()
  const redis = createRedisMock()
  const mailer = { sendMail: async () => {} }
  const service = new AuthService(userRepo, refreshTokenRepo, redis, mailer)

  const user = new User({
    id: 'user-1',
    email: 'lock@example.com',
    fullName: 'Lock User',
    isActive: true,
  })

  await user.changePassword('Password123', bcrypt)
  await userRepo.save(user)

  for (let attempt = 1; attempt < 5; attempt += 1) {
    await assert.rejects(
      service.login('lock@example.com', 'wrong-password'),
      (error) => error.code === 'INVALID_CREDENTIALS'
    )
  }

  await assert.rejects(
    service.login('lock@example.com', 'wrong-password'),
    (error) => error.code === 'ACCOUNT_TEMPORARILY_LOCKED' && error.statusCode === 423
  )

  await assert.rejects(
    service.login('lock@example.com', 'Password123'),
    (error) => error.code === 'ACCOUNT_TEMPORARILY_LOCKED'
  )
})

test('refreshToken rotates token and invalidates the old refresh token', async () => {
  const userRepo = createUserRepoMock()
  const refreshTokenRepo = createRefreshTokenRepoMock()
  const redis = createRedisMock()
  const mailer = { sendMail: async () => {} }
  const service = new AuthService(userRepo, refreshTokenRepo, redis, mailer)

  const user = new User({
    id: 'user-1',
    email: 'refresh@example.com',
    fullName: 'Refresh User',
    isActive: true,
  })

  await user.changePassword('Password123', bcrypt)
  await userRepo.save(user)

  const loginResult = await service.login('refresh@example.com', 'Password123')
  const rotatedResult = await service.refreshToken(loginResult.refreshToken)

  assert.ok(rotatedResult.accessToken)
  assert.ok(rotatedResult.refreshToken)
  assert.notEqual(rotatedResult.refreshToken, loginResult.refreshToken)

  await assert.rejects(
    service.refreshToken(loginResult.refreshToken),
    (error) => error.code === 'INVALID_REFRESH_TOKEN'
  )
})

test('resetPassword revokes all refresh tokens for the user', async () => {
  const userRepo = createUserRepoMock()
  const refreshTokenRepo = createRefreshTokenRepoMock()
  const redis = createRedisMock()
  const mailer = { sendMail: async () => {} }
  const service = new AuthService(userRepo, refreshTokenRepo, redis, mailer)

  const user = new User({
    id: 'user-1',
    email: 'reset@example.com',
    fullName: 'Reset User',
    isActive: true,
  })

  await user.changePassword('Password123', bcrypt)
  await userRepo.save(user)

  const firstLogin = await service.login('reset@example.com', 'Password123')
  const secondLogin = await service.login('reset@example.com', 'Password123')

  await redis.setEx('reset:reset-token', 900, user.id)
  await service.resetPassword('reset-token', 'NewPassword123')

  await assert.rejects(
    service.refreshToken(firstLogin.refreshToken),
    (error) => error.code === 'INVALID_REFRESH_TOKEN'
  )

  await assert.rejects(
    service.refreshToken(secondLogin.refreshToken),
    (error) => error.code === 'INVALID_REFRESH_TOKEN'
  )
})
