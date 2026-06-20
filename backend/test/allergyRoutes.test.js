const { test, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const jwt = require('jsonwebtoken')

process.env.JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

const mockState = {
  drugs: [],
  allergies: [],
}

const mockPool = {
  async query(text, params) {
    const sql = text.replace(/\s+/g, ' ').trim()

    if (sql.includes('INSERT INTO allergies')) {
      const [userId, drugId, reactionType, severity] = params
      const existing = mockState.allergies.some(
        (item) => item.user_id === userId && item.drug_id === drugId
      )

      if (existing) {
        const error = new Error('duplicate allergy')
        error.code = '23505'
        throw error
      }

      const drug = mockState.drugs.find((item) => item.id === drugId)
      if (!drug) {
        const error = new Error('drug not found')
        error.code = '23503'
        throw error
      }

      const row = {
        id: `allergy-${mockState.allergies.length + 1}`,
        user_id: userId,
        drug_id: drugId,
        reaction_type: reactionType,
        severity,
        created_at: new Date().toISOString(),
        drug_name: drug.name,
        generic_name: drug.generic_name || null,
      }

      mockState.allergies.push({
        id: row.id,
        user_id: row.user_id,
        drug_id: row.drug_id,
        reaction_type: row.reaction_type,
        severity: row.severity,
        created_at: row.created_at,
      })

      return { rows: [row] }
    }

    if (sql.startsWith('SELECT allergies.*, drugs.name AS drug_name, drugs.generic_name')) {
      const [userId] = params
      const rows = mockState.allergies
        .filter((item) => item.user_id === userId)
        .sort((first, second) => new Date(second.created_at) - new Date(first.created_at))
        .map((item) => {
          const drug = mockState.drugs.find((entry) => entry.id === item.drug_id)
          return {
            ...item,
            drug_name: drug?.name || null,
            generic_name: drug?.generic_name || null,
          }
        })

      return { rows }
    }

    if (sql.includes('SELECT id, name, generic_name FROM drugs') || sql.includes('SELECT id, name, generic_name, category FROM drugs')) {
      const q = params && params[0] ? params[0].replace(/%/g, '').toLowerCase() : null
      let rows = mockState.drugs
      if (q) {
        rows = rows.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.generic_name.toLowerCase().includes(q)
        )
      }
      return { rows }
    }

    if (sql.includes('UPDATE allergies')) {
      const [id, userId, drugId, reactionType, severity] = params
      const index = mockState.allergies.findIndex(
        (item) => item.id === id && item.user_id === userId
      )
      if (index === -1) {
        return { rows: [] }
      }

      const drug = mockState.drugs.find((item) => item.id === drugId)
      if (!drug && drugId) {
        const error = new Error('drug not found')
        error.code = '23503'
        throw error
      }

      const row = {
        id,
        user_id: userId,
        drug_id: drugId || mockState.allergies[index].drug_id,
        reaction_type: reactionType,
        severity,
        created_at: mockState.allergies[index].created_at,
        drug_name: drug ? drug.name : null,
        generic_name: drug ? (drug.generic_name || null) : null,
      }

      mockState.allergies[index] = {
        id: row.id,
        user_id: row.user_id,
        drug_id: row.drug_id,
        reaction_type: row.reaction_type,
        severity: row.severity,
        created_at: row.created_at,
      }

      return { rows: [row] }
    }

    if (sql.includes('DELETE FROM allergies')) {
      const [id, userId] = params
      const index = mockState.allergies.findIndex(
        (item) => item.id === id && item.user_id === userId
      )
      if (index === -1) {
        return { rowCount: 0 }
      }
      mockState.allergies.splice(index, 1)
      return { rowCount: 1 }
    }

    throw new Error(`Unexpected SQL in allergyRoutes.test: ${sql}`)
  },
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
  mockState.drugs = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Paracetamol', generic_name: 'Paracetamol' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Ibuprofen', generic_name: 'Ibuprofen' },
  ]
  mockState.allergies = [
    {
      id: '33333333-3333-3333-3333-333333333333',
      user_id: 'user-1',
      drug_id: '11111111-1111-1111-1111-111111111111',
      reaction_type: 'rash',
      severity: 'mild',
      created_at: '2026-06-17T10:00:00.000Z',
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      user_id: 'other-user',
      drug_id: '22222222-2222-2222-2222-222222222222',
      reaction_type: 'nausea',
      severity: 'moderate',
      created_at: '2026-06-17T09:00:00.000Z',
    },
  ]
})

const createAccessToken = (userId) =>
  jwt.sign({ userId, role: 'patient' }, process.env.JWT_SECRET)

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

test('GET /api/v1/allergies returns current user allergy details with drug_name', async () => {
  const response = await requestJson({
    method: 'GET',
    path: '/api/v1/allergies',
    token: createAccessToken('user-1'),
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.success, true)
  assert.equal(response.body.data.length, 1)
  assert.equal(response.body.data[0].drug_name, 'Paracetamol')
  assert.equal(response.body.data[0].reaction_type, 'rash')
})

test('POST /api/v1/allergies creates a new allergy and GET returns the new record', async () => {
  const token = createAccessToken('user-1')

  const createResponse = await requestJson({
    method: 'POST',
    path: '/api/v1/allergies',
    token,
    body: {
      drugId: '22222222-2222-2222-2222-222222222222',
      reactionType: 'swelling',
      severity: 'severe',
    },
  })

  assert.equal(createResponse.statusCode, 201)
  assert.equal(createResponse.body.success, true)
  assert.equal(createResponse.body.message, 'Thêm dị ứng thành công')
  assert.equal(createResponse.body.data.user_id, 'user-1')
  assert.equal(createResponse.body.data.drug_id, '22222222-2222-2222-2222-222222222222')
  assert.equal(createResponse.body.data.drug_name, 'Ibuprofen')

  const listResponse = await requestJson({
    method: 'GET',
    path: '/api/v1/allergies',
    token,
  })

  assert.equal(listResponse.statusCode, 200)
  assert.equal(listResponse.body.data.length, 2)

  const createdRecord = listResponse.body.data.find(
    (item) => item.drug_id === '22222222-2222-2222-2222-222222222222'
  )

  assert.ok(createdRecord)
  assert.equal(createdRecord.drug_name, 'Ibuprofen')
  assert.equal(createdRecord.severity, 'severe')
})

test('POST /api/v1/allergies returns 409 when the same drug allergy already exists', async () => {
  const response = await requestJson({
    method: 'POST',
    path: '/api/v1/allergies',
    token: createAccessToken('user-1'),
    body: {
      drugId: '11111111-1111-1111-1111-111111111111',
      reactionType: 'rash',
      severity: 'mild',
    },
  })

  assert.equal(response.statusCode, 409)
  assert.equal(response.body.success, false)
  assert.equal(response.body.code, 'ALLERGY_ALREADY_EXISTS')
})

test('POST /api/v1/allergies rejects invalid payload', async () => {
  const response = await requestJson({
    method: 'POST',
    path: '/api/v1/allergies',
    token: createAccessToken('user-1'),
    body: {
      reactionType: 'rash',
      severity: 'critical',
    },
  })

  assert.equal(response.statusCode, 400)
  assert.equal(response.body.success, false)
  assert.match(response.body.message, /Vui long cung cap ID thuoc hoac Ten thuoc|Muc do di ung khong hop le/)
})

test('POST /api/v1/allergies resolves drugName with fuzzy/semantic match and creates allergy', async () => {
  const token = createAccessToken('user-1')
  const response = await requestJson({
    method: 'POST',
    path: '/api/v1/allergies',
    token,
    body: {
      drugName: 'ibuprofen',
      reactionType: 'rash',
      severity: 'mild',
    },
  })

  assert.equal(response.statusCode, 201)
  assert.equal(response.body.success, true)
  assert.equal(response.body.data.drug_name, 'Ibuprofen')
})

test('GET /api/v1/allergies/drugs returns list of drugs matching query', async () => {
  const token = createAccessToken('user-1')
  const response = await requestJson({
    method: 'GET',
    path: '/api/v1/allergies/drugs?q=ibu',
    token,
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.success, true)
  assert.ok(response.body.data.length >= 1)
  assert.equal(response.body.data[0].name, 'Ibuprofen')
})

test('PUT /api/v1/allergies/:id updates severity and reactionType', async () => {
  const token = createAccessToken('user-1')
  const response = await requestJson({
    method: 'PUT',
    path: '/api/v1/allergies/33333333-3333-3333-3333-333333333333',
    token,
    body: {
      drugId: '11111111-1111-1111-1111-111111111111',
      reactionType: 'severe rash',
      severity: 'severe',
    },
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.success, true)
  assert.equal(response.body.data.severity, 'severe')
  assert.equal(response.body.data.reaction_type, 'severe rash')
})

test('DELETE /api/v1/allergies/:id deletes the allergy record', async () => {
  const token = createAccessToken('user-1')
  const deleteResponse = await requestJson({
    method: 'DELETE',
    path: '/api/v1/allergies/33333333-3333-3333-3333-333333333333',
    token,
  })

  assert.equal(deleteResponse.statusCode, 200)
  assert.equal(deleteResponse.body.success, true)

  const listResponse = await requestJson({
    method: 'GET',
    path: '/api/v1/allergies',
    token,
  })

  assert.equal(listResponse.statusCode, 200)
  const exists = listResponse.body.data.some(item => item.id === '33333333-3333-3333-3333-333333333333')
  assert.equal(exists, false)
})


