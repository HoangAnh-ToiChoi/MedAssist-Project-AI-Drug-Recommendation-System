const test = require('node:test')
const assert = require('node:assert/strict')
const Joi = require('joi')

const validate = require('../src/middlewares/validate')

test('validate writes sanitized Joi value back to req.body', async () => {
  const middleware = validate(Joi.object({
    fullName: Joi.string().trim().required(),
  }))

  const req = {
    body: {
      fullName: '  Med Assist  ',
      extraField: 'remove me',
    },
  }

  const res = {
    status() {
      throw new Error('should not fail validation')
    },
  }

  await new Promise((resolve, reject) => {
    middleware(req, res, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })

  assert.deepEqual(req.body, { fullName: 'Med Assist' })
})
