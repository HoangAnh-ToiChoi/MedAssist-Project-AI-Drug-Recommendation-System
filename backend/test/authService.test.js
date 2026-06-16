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

test('register creates pending user and login is blocked until OTP verification', async () => {
  const userRepo = createUserRepoMock()
  const redis = createRedisMock()
  const mailer = { sendMail: async () => {} }
  const service = new AuthService(userRepo, redis, mailer)

  const result = await service.register('pending@example.com', 'Password123', 'Pending User')
  const savedUser = await userRepo.findByEmailIncludingInactive('pending@example.com')

  assert.equal(result.requiresVerification, true)
  assert.equal(savedUser.isActive, false)

  await assert.rejects(
    service.login('pending@example.com', 'Password123'),
    (error) => error instanceof AppError && error.code === 'ACCOUNT_NOT_VERIFIED'
  )
})

test('verifyOtp activates pending user and returns tokens', async () => {
  const userRepo = createUserRepoMock()
  const redis = createRedisMock()
  const mailer = { sendMail: async () => {} }
  const service = new AuthService(userRepo, redis, mailer)

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
