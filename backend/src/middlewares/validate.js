const ApiResponse = require('../utils/ApiResponse')

// Factory: nhận Joi schema, trả Express middleware
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true })
  if (error) {
    const message = error.details.map((d) => d.message).join('; ')
    return res.status(400).json(ApiResponse.error(message, 'VALIDATION_ERROR'))
  }
  next()
}

module.exports = validate
