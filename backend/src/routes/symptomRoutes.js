const { Router } = require('express')
const Joi = require('joi')
const authenticate = require('../middlewares/auth')
const validate = require('../middlewares/validate')
const container = require('../config/container')

const router = Router()

// Resolve controllers from DI container
const symptomController = container.resolve('symptomController')
const recommendationController = container.resolve('recommendationController')

// ── Validation schema ────────────────────────────────────────────────────────
const checkSchema = Joi.object({
  symptoms: Joi.array().items(
    Joi.string().trim().min(1).messages({
      'string.min':   'Triệu chứng không được để trống',
      'string.empty': 'Triệu chứng không được để trống',
    })
  ).min(1).required().messages({
    'array.min':    'Vui lòng chọn ít nhất một triệu chứng',
    'array.base':   'symptoms phải là mảng',
    'any.required': 'Danh sách triệu chứng là bắt buộc',
  }),
})

// ── Routes ───────────────────────────────────────────────────────────────────
router.get('/',      authenticate, symptomController.getAll.bind(symptomController))
router.post('/check', authenticate, validate(checkSchema), recommendationController.check.bind(recommendationController))

module.exports = router
