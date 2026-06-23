const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const Module = require('node:module')

process.env.JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

const mockState = {
  specialties: [
    {
      id: 'spec-1',
      code: 'respiratory',
      name: 'Ho hap',
      description: 'Benh ly ho hap',
      display_order: 1,
    },
    {
      id: 'spec-2',
      code: 'dermatology',
      name: 'Da lieu',
      description: 'Benh ly da lieu',
      display_order: 2,
    },
  ],
  symptomsBySpecialty: {
    respiratory: [
      { id: 'sym-1', code: 'COUGH', name: 'Cough' },
      { id: 'sym-2', code: 'FEVER', name: 'Fever' },
    ],
    dermatology: [
      { id: 'sym-3', code: 'RASH', name: 'Rash' },
    ],
  },
  diseasesBySpecialty: {
    respiratory: [
      {
        id: 'dis-1',
        code: 'FLU',
        display_name: 'Influenza',
        canonical_name: 'Influenza',
        icd10_code: 'J10',
        disease_type_code: 'respiratory',
      },
    ],
    dermatology: [
      {
        id: 'dis-2',
        code: 'ECZEMA',
        display_name: 'Eczema',
        canonical_name: 'Atopic dermatitis',
        icd10_code: 'L20',
        disease_type_code: 'dermatology',
      },
    ],
  },
}

const noop = (req, res, next) => next()

const loggerMock = {
  info() {},
  warn() {},
  error() {},
}

const buildValidationError = (message) => ({
  details: [{ message }],
})

class StringSchema {
  constructor() {
    this._trim = false
    this._min = null
    this._max = null
    this._required = false
    this._valid = null
    this._allow = new Set()
    this._messages = {}
  }

  trim() {
    this._trim = true
    return this
  }

  min(value) {
    this._min = value
    return this
  }

  max(value) {
    this._max = value
    return this
  }

  required() {
    this._required = true
    return this
  }

  optional() {
    this._required = false
    return this
  }

  allow(...values) {
    values.forEach((value) => this._allow.add(value))
    return this
  }

  valid(...values) {
    this._valid = new Set(values)
    return this
  }

  messages(messages) {
    this._messages = { ...this._messages, ...messages }
    return this
  }

  validate(value) {
    if (value === undefined || value === null) {
      if (this._required) {
        return {
          error: buildValidationError(this._messages['any.required'] || 'Value is required'),
        }
      }

      return { value }
    }

    if (this._allow.has(value)) {
      return { value }
    }

    if (typeof value !== 'string') {
      return {
        error: buildValidationError(this._messages['string.base'] || 'Value must be a string'),
      }
    }

    const normalized = this._trim ? value.trim() : value

    if (normalized.length === 0) {
      if (this._required) {
        return {
          error: buildValidationError(this._messages['string.empty'] || 'Value cannot be empty'),
        }
      }

      if (this._min !== null && this._min > 0) {
        return {
          error: buildValidationError(this._messages['string.min'] || 'Value is too short'),
        }
      }
    }

    if (this._min !== null && normalized.length < this._min) {
      return {
        error: buildValidationError(this._messages['string.min'] || 'Value is too short'),
      }
    }

    if (this._max !== null && normalized.length > this._max) {
      return {
        error: buildValidationError(this._messages['string.max'] || 'Value is too long'),
      }
    }

    if (this._valid && !this._valid.has(normalized)) {
      return {
        error: buildValidationError(this._messages['any.only'] || 'Value is invalid'),
      }
    }

    return { value: normalized }
  }
}

class NumberSchema {
  constructor() {
    this._min = null
    this._max = null
    this._required = false
    this._messages = {}
  }

  min(value) {
    this._min = value
    return this
  }

  max(value) {
    this._max = value
    return this
  }

  required() {
    this._required = true
    return this
  }

  optional() {
    this._required = false
    return this
  }

  messages(messages) {
    this._messages = { ...this._messages, ...messages }
    return this
  }

  validate(value) {
    if (value === undefined || value === null) {
      if (this._required) {
        return {
          error: buildValidationError(this._messages['any.required'] || 'Value is required'),
        }
      }

      return { value }
    }

    if (typeof value !== 'number' || Number.isNaN(value)) {
      return {
        error: buildValidationError(this._messages['number.base'] || 'Value must be a number'),
      }
    }

    if (this._min !== null && value < this._min) {
      return {
        error: buildValidationError(this._messages['number.min'] || 'Value is too small'),
      }
    }

    if (this._max !== null && value > this._max) {
      return {
        error: buildValidationError(this._messages['number.max'] || 'Value is too large'),
      }
    }

    return { value }
  }
}

class ArraySchema {
  constructor() {
    this._itemSchema = null
    this._min = null
    this._required = false
    this._messages = {}
  }

  items(schema) {
    this._itemSchema = schema
    return this
  }

  min(value) {
    this._min = value
    return this
  }

  required() {
    this._required = true
    return this
  }

  optional() {
    this._required = false
    return this
  }

  messages(messages) {
    this._messages = { ...this._messages, ...messages }
    return this
  }

  validate(value) {
    if (value === undefined || value === null) {
      if (this._required) {
        return {
          error: buildValidationError(this._messages['any.required'] || 'Value is required'),
        }
      }

      return { value }
    }

    if (!Array.isArray(value)) {
      return {
        error: buildValidationError(this._messages['array.base'] || 'Value must be an array'),
      }
    }

    const normalized = []
    const details = []

    for (const item of value) {
      const result = this._itemSchema ? this._itemSchema.validate(item) : { value: item }
      if (result.error) {
        details.push(...result.error.details)
      } else {
        normalized.push(result.value)
      }
    }

    if (this._min !== null && normalized.length < this._min) {
      details.push({
        message: this._messages['array.min'] || 'Array must contain more items',
      })
    }

    if (details.length > 0) {
      return { error: { details } }
    }

    return { value: normalized }
  }
}

class ObjectSchema {
  constructor(shape) {
    this._shape = shape
    this._required = false
    this._messages = {}
  }

  required() {
    this._required = true
    return this
  }

  optional() {
    this._required = false
    return this
  }

  messages(messages) {
    this._messages = { ...this._messages, ...messages }
    return this
  }

  validate(value, options = {}) {
    if ((value === undefined || value === null) && !this._required) {
      return { value }
    }

    const source = value && typeof value === 'object' ? value : {}
    const normalized = options.stripUnknown ? {} : { ...source }
    const details = []

    for (const [key, schema] of Object.entries(this._shape)) {
      const result = schema.validate(source[key], options)
      if (result.error) {
        details.push(...result.error.details)
      } else if (result.value !== undefined || key in source) {
        normalized[key] = result.value
      }
    }

    if (details.length > 0) {
      return { error: { details } }
    }

    return { value: normalized }
  }
}

const joiMock = {
  object(shape) {
    return new ObjectSchema(shape)
  },
  string() {
    return new StringSchema()
  },
  number() {
    return new NumberSchema()
  },
  array() {
    return new ArraySchema()
  },
}

const normalizePath = (path) => {
  const [pathname] = String(path || '/').split('?')
  if (!pathname || pathname === '/') return '/'
  const trimmed = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  return trimmed || '/'
}

const joinPaths = (basePath, routePath) => {
  const left = normalizePath(basePath)
  const right = normalizePath(routePath)

  if (left === '/') return right
  if (right === '/') return left
  return `${left}${right}`
}

const matchPath = (pattern, pathname) => {
  const normalizedPattern = normalizePath(pattern)
  const normalizedPathname = normalizePath(pathname)

  if (normalizedPattern === normalizedPathname) {
    return {}
  }

  const patternSegments = normalizedPattern.split('/').filter(Boolean)
  const pathSegments = normalizedPathname.split('/').filter(Boolean)

  if (patternSegments.length !== pathSegments.length) {
    return null
  }

  const params = {}

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index]
    const pathSegment = pathSegments[index]

    if (patternSegment.startsWith(':')) {
      params[patternSegment.slice(1)] = decodeURIComponent(pathSegment)
      continue
    }

    if (patternSegment !== pathSegment) {
      return null
    }
  }

  return params
}

const invokeHandler = (handler, req, res, next, isErrorHandler = false, error = null) => {
  try {
    const result = isErrorHandler
      ? handler(error, req, res, next)
      : handler(req, res, next)

    if (result && typeof result.then === 'function') {
      result.catch(next)
    }
  } catch (err) {
    next(err)
  }
}

const createRouter = () => {
  const stack = []

  return {
    __isRouter: true,
    _stack: stack,
    use(pathOrHandler, maybeHandler) {
      const path = typeof pathOrHandler === 'string' ? pathOrHandler : '/'
      const handler = typeof pathOrHandler === 'string' ? maybeHandler : pathOrHandler
      stack.push({
        kind: handler.length === 4 ? 'error' : 'middleware',
        path,
        handler,
      })
    },
    get(path, ...handlers) {
      stack.push({ kind: 'route', method: 'GET', path, handlers })
    },
    post(path, ...handlers) {
      stack.push({ kind: 'route', method: 'POST', path, handlers })
    },
  }
}

const createApp = () => {
  const stack = []
  const errorHandlers = []

  const app = (req, res) => {
    req.originalUrl = req.url
    req.path = normalizePath(req.url)
    req.query = {}
    req.params = {}

    res.status = (code) => {
      res.statusCode = code
      return res
    }

    res.json = (payload) => {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json')
      }
      res.end(JSON.stringify(payload))
      return res
    }

    let bodyBuffer = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      bodyBuffer += chunk
    })
    req.on('end', () => {
      try {
        req.body = bodyBuffer ? JSON.parse(bodyBuffer) : {}
      } catch {
        req.body = {}
      }

      let stackIndex = 0

      const runErrorHandlers = (error) => {
        let errorIndex = 0

        const nextError = (nextErrorValue) => {
          if (!nextErrorValue) {
            return
          }

          const handler = errorHandlers[errorIndex]
          errorIndex += 1

          if (!handler) {
            if (!res.writableEnded) {
              res.status(500).json({
                success: false,
                message: nextErrorValue.message || 'Unhandled error',
              })
            }
            return
          }

          invokeHandler(handler, req, res, nextError, true, nextErrorValue)
        }

        nextError(error)
      }

      const next = (error) => {
        if (error) {
          runErrorHandlers(error)
          return
        }

        const layer = stack[stackIndex]
        stackIndex += 1

        if (!layer) {
          if (!res.writableEnded) {
            res.status(404).json({
              success: false,
              message: 'Not found',
            })
          }
          return
        }

        if (layer.kind === 'middleware') {
          const middlewarePath = normalizePath(layer.path)
          const matches =
            middlewarePath === '/' ||
            req.path === middlewarePath ||
            req.path.startsWith(`${middlewarePath}/`)

          if (!matches) {
            next()
            return
          }

          invokeHandler(layer.handler, req, res, next)
          return
        }

        if (layer.kind === 'route') {
          if (layer.method !== req.method) {
            next()
            return
          }

          const params = matchPath(layer.path, req.path)
          if (!params) {
            next()
            return
          }

          req.params = params

          let handlerIndex = 0
          const nextRoute = (routeError) => {
            if (routeError) {
              runErrorHandlers(routeError)
              return
            }

            const handler = layer.handlers[handlerIndex]
            handlerIndex += 1

            if (!handler) {
              if (!res.writableEnded) {
                res.end()
              }
              return
            }

            invokeHandler(handler, req, res, nextRoute)
          }

          nextRoute()
        }
      }

      next()
    })
  }

  app.use = (pathOrHandler, maybeHandler) => {
    const path = typeof pathOrHandler === 'string' ? pathOrHandler : '/'
    const handler = typeof pathOrHandler === 'string' ? maybeHandler : pathOrHandler

    if (handler && handler.__isRouter) {
      for (const layer of handler._stack) {
        if (layer.kind === 'route') {
          stack.push({
            kind: 'route',
            method: layer.method,
            path: joinPaths(path, layer.path),
            handlers: layer.handlers,
          })
        } else if (layer.kind === 'middleware') {
          stack.push({
            kind: 'middleware',
            path: joinPaths(path, layer.path),
            handler: layer.handler,
          })
        } else if (layer.kind === 'error') {
          errorHandlers.push(layer.handler)
        }
      }
      return
    }

    if (handler.length === 4) {
      errorHandlers.push(handler)
      return
    }

    stack.push({
      kind: 'middleware',
      path,
      handler,
    })
  }

  app.get = (path, ...handlers) => {
    stack.push({ kind: 'route', method: 'GET', path, handlers })
  }

  app.post = (path, ...handlers) => {
    stack.push({ kind: 'route', method: 'POST', path, handlers })
  }

  return app
}

const expressMock = Object.assign(
  () => createApp(),
  {
    Router: createRouter,
    json: () => noop,
    urlencoded: () => noop,
  }
)

const specialtyControllerMock = {
  getAll(req, res) {
    res.json({
      success: true,
      message: 'Thành công',
      data: mockState.specialties.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        displayOrder: item.display_order,
      })),
    })
  },

  getSymptoms(req, res) {
    res.json({
      success: true,
      message: 'Thành công',
      data: mockState.symptomsBySpecialty[req.params.specialtyCode] || [],
    })
  },

  getDiseases(req, res) {
    const diseases = (mockState.diseasesBySpecialty[req.params.specialtyCode] || []).map((item) => ({
      id: item.id,
      code: item.code,
      displayName: item.display_name,
      canonicalName: item.canonical_name,
      icd10Code: item.icd10_code,
      diseaseTypeCode: item.disease_type_code,
      score: undefined,
    }))

    res.json({
      success: true,
      message: 'Thành công',
      data: diseases,
    })
  },
}

const symptomControllerMock = {
  getAll(req, res) {
    res.json({
      success: true,
      message: 'Thành công',
      data: [],
    })
  },
}

const recommendationControllerMock = {
  check(req, res) {
    res.json({
      success: true,
      message: 'Gợi ý thuốc thành công',
      data: {
        specialty: req.body.specialty,
        symptoms: req.body.symptoms,
      },
    })
  },
}

const chatbotControllerMock = {
  chatOnRecommendation(req, res) {
    res.json({
      success: true,
      message: 'Chatbot grounded trả lời thành công',
      data: {
        question: req.body.question,
      },
    })
  },
}

const aiAuditInsightsControllerMock = {
  getSummary(req, res) {
    res.json({
      success: true,
      message: 'AI audit summary loaded',
      data: { rowCount: 0, fallbackRate: 0 },
    })
  },
  getRecentEvents(req, res) {
    res.json({
      success: true,
      message: 'AI audit events loaded',
      data: [],
    })
  },
}

const profileControllerMock = {
  getProfile(req, res) {
    res.json({
      success: true,
      message: 'Profile loaded',
      data: { id: req.user.id },
    })
  },
  updateProfile(req, res) {
    res.json({
      success: true,
      message: 'Profile updated',
      data: req.body,
    })
  },
}

const adminControllerMock = {
  getAllUsers(req, res) {
    res.json({
      success: true,
      message: 'Users loaded',
      data: [],
    })
  },
  updateUserStatus(req, res) {
    res.json({
      success: true,
      message: 'User status updated',
      data: { id: req.params.id, isActive: req.body.isActive },
    })
  },
}

const authMiddlewareMock = (req, res, next) => {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
      code: 'UNAUTHORIZED',
    })
    return
  }

  req.user = { id: 'user-1', userId: 'user-1', role: 'admin' }
  next()
}

const containerMock = {
  resolve(name) {
    if (name === 'specialtyController') return specialtyControllerMock
    if (name === 'symptomController') return symptomControllerMock
    if (name === 'recommendationController') return recommendationControllerMock
    if (name === 'chatbotController') return chatbotControllerMock
    if (name === 'aiAuditInsightsController') return aiAuditInsightsControllerMock
    if (name === 'profileController') return profileControllerMock
    if (name === 'adminController') return adminControllerMock
    throw new Error(`Unexpected container resolve: ${name}`)
  },
}

const originalModuleLoad = Module._load

Module._load = function patchedModuleLoad(request, parent, isMain) {
  if (request === 'express') {
    return expressMock
  }

  if (request === 'cors') {
    return () => noop
  }

  if (request === 'joi') {
    return joiMock
  }

  if (request === './utils/logger' || request === '../utils/logger') {
    return loggerMock
  }

  if (
    request === './routes/authRoutes' ||
    request === './routes/historyRoutes' ||
    request === './routes/allergyRoutes' ||
    request === './routes/profileRoutes' ||
    request === './routes/adminRoutes'
  ) {
    return createRouter()
  }

  if (request === '../middlewares/auth') {
    return authMiddlewareMock
  }

  if (request === '../config/container') {
    return containerMock
  }

  return originalModuleLoad.call(this, request, parent, isMain)
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
  Module._load = originalModuleLoad

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
})

const createAccessToken = () => 'test-token'

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

test('GET /api/v1/specialties returns authenticated specialty list', async () => {
  const response = await requestJson({
    method: 'GET',
    path: '/api/v1/specialties',
    token: createAccessToken(),
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.success, true)
  assert.equal(response.body.data.length, 2)
  assert.deepEqual(response.body.data[0], {
    id: 'spec-1',
    code: 'respiratory',
    name: 'Ho hap',
    description: 'Benh ly ho hap',
    displayOrder: 1,
  })
})

test('GET /api/v1/specialties/:specialtyCode/symptoms returns specialty-scoped symptoms', async () => {
  const response = await requestJson({
    method: 'GET',
    path: '/api/v1/specialties/respiratory/symptoms',
    token: createAccessToken(),
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.success, true)
  assert.deepEqual(response.body.data, [
    { id: 'sym-1', code: 'COUGH', name: 'Cough' },
    { id: 'sym-2', code: 'FEVER', name: 'Fever' },
  ])
})

test('GET /api/v1/specialties/:specialtyCode/diseases returns specialty-scoped diseases', async () => {
  const response = await requestJson({
    method: 'GET',
    path: '/api/v1/specialties/dermatology/diseases',
    token: createAccessToken(),
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.success, true)
  assert.deepEqual(response.body.data, [
    {
      id: 'dis-2',
      code: 'ECZEMA',
      displayName: 'Eczema',
      canonicalName: 'Atopic dermatitis',
      icd10Code: 'L20',
      diseaseTypeCode: 'dermatology',
    },
  ])
})

test('POST /api/v1/symptoms/check rejects missing specialty', async () => {
  const response = await requestJson({
    method: 'POST',
    path: '/api/v1/symptoms/check',
    token: createAccessToken(),
    body: {
      symptoms: ['Cough'],
    },
  })

  assert.equal(response.statusCode, 400)
  assert.equal(response.body.success, false)
  assert.equal(response.body.code, 'VALIDATION_ERROR')
  assert.equal(response.body.message, 'Chuyên khoa là bắt buộc')
})
