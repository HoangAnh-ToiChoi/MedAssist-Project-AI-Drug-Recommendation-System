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

    if (sql.includes('SELECT id, email, full_name, date_of_birth, gender, phone_number, role, is_active, created_at, updated_at FROM users')) {
      const [id] = params
      const user = mockState.users.find(u => u.id === id)
      return { rows: user ? [user] : [] }
    }

    if (sql.includes('UPDATE users')) {
      const id = params[0]
      const userIndex = mockState.users.findIndex(u => u.id === id)
      if (userIndex === -1) {
        return { rows: [] }
      }

      // Quick parsing of the columns and parameters
      const updatedFields = {}
      if (sql.includes('full_name =')) {
        const index = sql.split('full_name =')[1].match(/\$(\d+)/)[1]
        updatedFields.full_name = params[index - 1]
      }
      if (sql.includes('date_of_birth =')) {
        const index = sql.split('date_of_birth =')[1].match(/\$(\d+)/)[1]
        updatedFields.date_of_birth = params[index - 1]
      }
      if (sql.includes('gender =')) {
        const index = sql.split('gender =')[1].match(/\$(\d+)/)[1]
        updatedFields.gender = params[index - 1]
      }
      if (sql.includes('phone_number =')) {
        const index = sql.split('phone_number =')[1].match(/\$(\d+)/)[1]
        updatedFields.phone_number = params[index - 1]
      }

      mockState.users[userIndex] = {
        ...mockState.users[userIndex],
        ...updatedFields,
        updated_at: new Date().toISOString()
      }

      return { rows: [mockState.users[userIndex]] }
    }

    throw new Error(`Unexpected SQL in profileRoutes.test: ${sql}`)
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
      id: 'user-1',
      email: 'test@example.com',
      password_hash: '$2a$10$abcdef',
      full_name: 'Test User',
      date_of_birth: '1995-05-15',
      gender: 'male',
      phone_number: '0987654321',
      role: 'user',
      is_active: true,
      created_at: '2026-06-17T10:00:00.000Z',
      updated_at: '2026-06-17T10:00:00.000Z'
    }
  ]
})

const createAccessToken = (userId) =>
  jwt.sign({ userId, role: 'user', type: 'access' }, process.env.JWT_SECRET)

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

test('GET /api/v1/profile returns user details without password_hash', async () => {
  const response = await requestJson({
    method: 'GET',
    path: '/api/v1/profile',
    token: createAccessToken('user-1'),
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.success, true)
  assert.equal(response.body.data.id, 'user-1')
  assert.equal(response.body.data.fullName, 'Test User')
  assert.equal(response.body.data.email, 'test@example.com')
  assert.equal(response.body.data.gender, 'male')
  assert.equal(response.body.data.phoneNumber, '0987654321')
  assert.equal(response.body.data.passwordHash, undefined)
})

test('GET /api/v1/profile returns 401 when token is missing', async () => {
  const response = await requestJson({
    method: 'GET',
    path: '/api/v1/profile',
  })

  assert.equal(response.statusCode, 401)
  assert.equal(response.body.success, false)
})

test('PUT /api/v1/profile updates details and converts gender to lowercase', async () => {
  const response = await requestJson({
    method: 'PUT',
    path: '/api/v1/profile',
    token: createAccessToken('user-1'),
    body: {
      fullName: 'Updated Name',
      dateOfBirth: '1990-12-25',
      gender: 'Female',
      phoneNumber: '0912345678'
    }
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.success, true)
  assert.equal(response.body.data.fullName, 'Updated Name')
  assert.equal(response.body.data.dateOfBirth, '1990-12-25')
  assert.equal(response.body.data.gender, 'female') // lowercase
  assert.equal(response.body.data.phoneNumber, '0912345678')
})

test('PUT /api/v1/profile returns 400 when fullName is missing', async () => {
  const response = await requestJson({
    method: 'PUT',
    path: '/api/v1/profile',
    token: createAccessToken('user-1'),
    body: {
      dateOfBirth: '1990-12-25',
      gender: 'Female',
      phoneNumber: '0912345678'
    }
  })

  assert.equal(response.statusCode, 400)
  assert.equal(response.body.success, false)
  assert.match(response.body.message, /Họ và tên là bắt buộc/)
})

test('PUT /api/v1/profile returns 400 when dateOfBirth is invalid format', async () => {
  const response = await requestJson({
    method: 'PUT',
    path: '/api/v1/profile',
    token: createAccessToken('user-1'),
    body: {
      fullName: 'Valid Name',
      dateOfBirth: '25-12-1990',
      gender: 'Female',
      phoneNumber: '0912345678'
    }
  })

  assert.equal(response.statusCode, 400)
  assert.equal(response.body.success, false)
  assert.match(response.body.message, /Ngày sinh phải đúng định dạng YYYY-MM-DD/)
})

test('PUT /api/v1/profile returns 400 when gender is invalid', async () => {
  const response = await requestJson({
    method: 'PUT',
    path: '/api/v1/profile',
    token: createAccessToken('user-1'),
    body: {
      fullName: 'Valid Name',
      dateOfBirth: '1990-12-25',
      gender: 'UnknownGender',
      phoneNumber: '0912345678'
    }
  })

  assert.equal(response.statusCode, 400)
  assert.equal(response.body.success, false)
  assert.match(response.body.message, /Giới tính chỉ nhận các giá trị/)
})

test('PUT /api/v1/profile returns 400 when phoneNumber is invalid format', async () => {
  const response = await requestJson({
    method: 'PUT',
    path: '/api/v1/profile',
    token: createAccessToken('user-1'),
    body: {
      fullName: 'Valid Name',
      dateOfBirth: '1990-12-25',
      gender: 'Female',
      phoneNumber: '123456'
    }
  })

  assert.equal(response.statusCode, 400)
  assert.equal(response.body.success, false)
  assert.match(response.body.message, /Số điện thoại không hợp lệ/)
})
