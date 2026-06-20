const ApiResponse = require('../utils/ApiResponse')

const validate = (schema) => (req, res, next) => {
  const options = {
    abortEarly: false,
    stripUnknown: true,
  }

  if (typeof schema.validate === 'function') {
    const { error, value } = schema.validate(req.body, options)

    if (error) {
      const message = error.details.map((detail) => detail.message).join('; ')
      return res.status(400).json(ApiResponse.error(message, 'VALIDATION_ERROR'))
    }

    req.body = value
    return next()
  }

  for (const source of ['params', 'query', 'body']) {
    if (!schema[source]) continue

    const { error, value } = schema[source].validate(req[source], options)
    if (error) {
      const message = error.details.map((detail) => detail.message).join('; ')
      return res.status(400).json(ApiResponse.error(message, 'VALIDATION_ERROR'))
    }

    req[source] = value
  }

  next()
}

module.exports = validate
