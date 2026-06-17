const { Router } = require('express')
const Joi = require('joi')
const authenticate = require('../middlewares/auth')
const validate = require('../middlewares/validate')
const container = require('../config/container')

const router = Router()

const allergyController = container.resolve('allergyController')

const createAllergySchema = Joi.object({
  drugId: Joi.string().guid().required().messages({
    'string.guid': 'ID thuoc khong hop le',
    'any.required': 'ID thuoc la bat buoc',
  }),
  reactionType: Joi.string().trim().min(1).max(100).messages({
    'string.empty': 'Loai phan ung khong duoc de trong',
    'string.min': 'Loai phan ung khong duoc de trong',
    'string.max': 'Loai phan ung khong duoc vuot qua 100 ky tu',
  }),
  severity: Joi.string().valid('mild', 'moderate', 'severe').messages({
    'any.only': 'Muc do di ung khong hop le',
  }),
})

router.get('/', authenticate, allergyController.getAllergies)
router.post('/', authenticate, validate(createAllergySchema), allergyController.addAllergy)

module.exports = router
