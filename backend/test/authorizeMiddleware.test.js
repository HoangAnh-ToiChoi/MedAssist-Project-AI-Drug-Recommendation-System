const { test } = require('node:test')
const assert = require('node:assert/strict')
const authorizeRoles = require('../src/middlewares/authorize')
const AppError = require('../src/utils/AppError')

test('authorizeRoles allows user with authorized role', () => {
  const middleware = authorizeRoles('admin', 'moderator')
  const req = { user: { role: 'admin' } }
  let nextCalled = false
  let nextError = null

  const next = (err) => {
    nextCalled = true
    nextError = err
  }

  middleware(req, {}, next)

  assert.equal(nextCalled, true)
  assert.equal(nextError, undefined)
})

test('authorizeRoles rejects user with unauthorized role', () => {
  const middleware = authorizeRoles('admin')
  const req = { user: { role: 'user' } }
  let nextCalled = false
  let nextError = null

  const next = (err) => {
    nextCalled = true
    nextError = err
  }

  middleware(req, {}, next)

  assert.equal(nextCalled, true)
  assert.ok(nextError instanceof AppError)
  assert.equal(nextError.statusCode, 403)
  assert.equal(nextError.code, 'FORBIDDEN_ERROR')
  assert.equal(nextError.message, 'Forbidden: You do not have permission')
})

test('authorizeRoles rejects when req.user is missing', () => {
  const middleware = authorizeRoles('admin')
  const req = {}
  let nextCalled = false
  let nextError = null

  const next = (err) => {
    nextCalled = true
    nextError = err
  }

  middleware(req, {}, next)

  assert.equal(nextCalled, true)
  assert.ok(nextError instanceof AppError)
  assert.equal(nextError.statusCode, 401)
  assert.equal(nextError.code, 'UNAUTHORIZED')
})
