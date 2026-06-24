const test = require('node:test')
const assert = require('node:assert/strict')

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
    async findByGoogleId(googleId) {
      for (const user of users.values()) {
        if (user.googleId === googleId && user.isActive) return user
      }
      return null
    },
    async findByFacebookId(facebookId) {
      for (const user of users.values()) {
        if (user.facebookId === facebookId && user.isActive) return user
      }
      return null
    },
    async findByAppleId(appleId) {
      for (const user of users.values()) {
        if (user.appleId === appleId && user.isActive) return user
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
  }
}

const createService = () => {
  const userRepo = createUserRepoMock()
  const refreshTokenRepo = createRefreshTokenRepoMock()
  const redis = createRedisMock()
  const mailer = { sendMail: async () => {} }
  const service = new AuthService(userRepo, refreshTokenRepo, redis, mailer)
  return { service, userRepo }
}

// ---------------------------------------------------------------------------
// GOOGLE LOGIN TESTS
// ---------------------------------------------------------------------------

test('[Google Login] registers new active user if not exists', async () => {
  const { service, userRepo } = createService()
  
  const token = 'mock_google_token:new-user@gmail.com:John Doe:google-id-111'
  const result = await service.loginWithGoogle(token)

  const createdUser = await userRepo.findByEmail('new-user@gmail.com')
  assert.ok(result.accessToken)
  assert.ok(result.refreshToken)
  assert.equal(createdUser.fullName, 'John Doe')
  assert.equal(createdUser.googleId, 'google-id-111')
  assert.equal(createdUser.isActive, true)
})

test('[Google Login] links google account to existing user by email', async () => {
  const { service, userRepo } = createService()
  
  // Register existing user
  const user = new User({ email: 'existing@gmail.com', fullName: 'Existing User', isActive: true })
  await userRepo.save(user)

  const token = 'mock_google_token:existing@gmail.com:Existing User:google-id-222'
  const result = await service.loginWithGoogle(token)

  const updatedUser = await userRepo.findByEmail('existing@gmail.com')
  assert.ok(result.accessToken)
  assert.equal(updatedUser.googleId, 'google-id-222')
})

test('[Google Login] logs in existing google user directly', async () => {
  const { service, userRepo } = createService()
  
  const user = new User({ email: 'existing@gmail.com', fullName: 'Existing User', googleId: 'google-id-333', isActive: true })
  await userRepo.save(user)

  const token = 'mock_google_token:existing@gmail.com:Existing User:google-id-333'
  const result = await service.loginWithGoogle(token)

  assert.ok(result.accessToken)
  assert.equal(result.user.email, 'existing@gmail.com')
})

// ---------------------------------------------------------------------------
// FACEBOOK LOGIN TESTS
// ---------------------------------------------------------------------------

test('[Facebook Login] registers new active user if not exists', async () => {
  const { service, userRepo } = createService()
  
  const token = 'mock_facebook_token:new-fb-user@gmail.com:Jane Doe:fb-id-111'
  const result = await service.loginWithFacebook(token)

  const createdUser = await userRepo.findByEmail('new-fb-user@gmail.com')
  assert.ok(result.accessToken)
  assert.equal(createdUser.fullName, 'Jane Doe')
  assert.equal(createdUser.facebookId, 'fb-id-111')
  assert.equal(createdUser.isActive, true)
})

// ---------------------------------------------------------------------------
// APPLE LOGIN TESTS
// ---------------------------------------------------------------------------

test('[Apple Login] registers new active user if not exists', async () => {
  const { service, userRepo } = createService()
  
  const token = 'mock_apple_token:new-apple-user@gmail.com:Apple User:apple-id-111'
  const result = await service.loginWithApple(token)

  const createdUser = await userRepo.findByEmail('new-apple-user@gmail.com')
  assert.ok(result.accessToken)
  assert.equal(createdUser.fullName, 'Apple User')
  assert.equal(createdUser.appleId, 'apple-id-111')
  assert.equal(createdUser.isActive, true)
})
