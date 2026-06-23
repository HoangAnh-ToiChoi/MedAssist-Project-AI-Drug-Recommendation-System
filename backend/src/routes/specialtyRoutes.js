const { Router } = require('express')
const Joi = require('joi')
const authenticate = require('../middlewares/auth')
const validate = require('../middlewares/validate')
const container = require('../config/container')

const router = Router()

const specialtyController = container.resolve('specialtyController')

const specialtyCodeParamSchema = Joi.object({
  specialtyCode: Joi.string().trim().min(1).required().messages({
    'string.base': 'Mã chuyên khoa phải là chuỗi',
    'string.empty': 'Mã chuyên khoa là bắt buộc',
    'string.min': 'Mã chuyên khoa là bắt buộc',
    'any.required': 'Mã chuyên khoa là bắt buộc',
  }),
})

router.get('/', authenticate, specialtyController.getAll.bind(specialtyController))
router.get(
  '/:specialtyCode/symptoms',
  authenticate,
  validate({ params: specialtyCodeParamSchema }),
  specialtyController.getSymptoms.bind(specialtyController)
)
router.get(
  '/:specialtyCode/diseases',
  authenticate,
  validate({ params: specialtyCodeParamSchema }),
  specialtyController.getDiseases.bind(specialtyController)
)

module.exports = router
