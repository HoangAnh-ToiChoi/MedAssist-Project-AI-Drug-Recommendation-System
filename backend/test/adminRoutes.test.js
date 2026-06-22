const { test, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const jwt = require('jsonwebtoken')

process.env.JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

const mockState = {
  users: []
}

const mockPool = {
  async query(text, params) {
    const sql = text.replace(/\s+/g, ' ').trim()

    // Mock query for authorize middleware to fetch requesting user info
    if (sql.includes('SELECT id, email, full_name, date_of_birth, gender, phone_number, role, is_active, created_at, updated_at FROM users WHERE id = $1')) {
      const [id] = params
      const user = mockState.users.find(u => u.id === id)
      return { rows: user ? [user] : [] }
    }

    // Mock query to fetch all users for the admin list
    if (sql.includes('SELECT id, email, full_name, date_of_birth, gender, phone_number, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC')) {
      return { rows: mockState.users }
    }

    throw new Error(`Unexpected SQL in adminRoutes.test: ${sql}`)
  }
}

const redisMock = {
  async get() {
    return null
  },
  async setEx() {},
  async del() {},
  async scan() {
    return { cursor: 0, keys: [] }
  },
}

const dbModulePath = require.resolve('../src/config/db')
const redisModulePath = require.resolve('../src/config/redis')

require.cache[dbModulePath] = {
  id: dbModulePath,
  filename: dbModulePath,
  loaded: true,
  exports: mockPool,
}

require.cache[redisModulePath] = {
  id: redisModulePath,
  filename: redisModulePath,
  loaded: true,
  exports: redisMock,
}

const app = require('../src/app')

let server
let port

before(async () => {
  server = http.createServer(app)
  await new Promise((resolve) => {
    server.listen(0, () => {
      port = server.address().port
      resolve()
    })
  })
})

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
})

beforeEach(() => {
  mockState.users = [
    {
      id: 'admin-1',
      email: 'admin@example.com',
      password_hash: '$2a$10$abcdef',
      full_name: 'Admin User',
      date_of_birth: '1985-05-15',
      gender: 'male',
      phone_number: '0987654321',
      role: 'admin',
      is_active: true,
      created_at: '2026-06-17T10:00:00.000Z',
      updated_at: '2026-06-17T10:00:00.000Z'
    },
    {
      id: 'user-1',
      email: 'user@example.com',
      password_hash: '$2a$10$abcdef',
      full_name: 'Regular User',
      date_of_birth: '1995-05-15',
      gender: 'female',
      phone_number: '0912345678',
      role: 'user',
      is_active: true,
      created_at: '2026-06-18T10:00:00.000Z',
      updated_at: '2026-06-18T10:00:00.000Z'
    }
  ]
})

const createAccessToken = (userId, role = 'user') =>
  jwt.sign({ userId, role, type: 'access' }, process.env.JWT_SECRET)

const requestJson = ({ method, path, token, body }) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(payload
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : null,
          })
        })
      }
    )

    req.on('error', reject)

    if (payload) {
      req.write(payload)
    }

    req.end()
  })

test('GET /api/v1/admin/users returns 401 when token is missing', async () => {
  const response = await requestJson({
    method: 'GET',
    path: '/api/v1/admin/users',
  })

  assert.equal(response.statusCode, 401)
  assert.equal(response.body.success, false)
})

test('GET /api/v1/admin/users returns 403 when user is not admin', async () => {
  const response = await requestJson({
    method: 'GET',
    path: '/api/v1/admin/users',
    token: createAccessToken('user-1', 'user'),
  })

  assert.equal(response.statusCode, 403)
  assert.equal(response.body.success, false)
  assert.match(response.body.message, /Forbidden: You do not have permission/)
})

test('GET /api/v1/admin/users returns 200 and list of users for admin', async () => {
  const response = await requestJson({
    method: 'GET',
    path: '/api/v1/admin/users',
    token: createAccessToken('admin-1', 'admin'),
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.success, true)
  assert.equal(response.body.data.length, 2)
  
  // Verify user details are returned and passwords are excluded
  const adminUser = response.body.data.find(u => u.id === 'admin-1')
  assert.equal(adminUser.fullName, 'Admin User')
  assert.equal(adminUser.email, 'admin@example.com')
  assert.equal(adminUser.role, 'admin')
  assert.equal(adminUser.passwordHash, undefined)

  const regUser = response.body.data.find(u => u.id === 'user-1')
  assert.equal(regUser.fullName, 'Regular User')
  assert.equal(regUser.email, 'user@example.com')
  assert.equal(regUser.role, 'user')
  assert.equal(regUser.passwordHash, undefined)
})
