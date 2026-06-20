const { Router } = require('express')
const Joi = require('joi')
const authenticate = require('../middlewares/auth')
const validate = require('../middlewares/validate')
const container = require('../config/container')

const router = Router()

const allergyController = container.resolve('allergyController')

const createAllergySchema = Joi.object({
  drugId: Joi.string().guid().optional().messages({
    'string.guid': 'ID thuoc khong hop le',
  }),
  drugName: Joi.string().trim().min(1).max(150).optional().messages({
    'string.empty': 'Ten thuoc khong duoc de trong',
    'string.min': 'Ten thuoc khong duoc de trong',
    'string.max': 'Ten thuoc khong duoc vuot qua 150 ky tu',
  }),
  reactionType: Joi.string().trim().max(100).allow('', null).messages({
    'string.max': 'Loai phan ung khong duoc vuot qua 100 ky tu',
  }),
  severity: Joi.string().valid('mild', 'moderate', 'severe').required().messages({
    'any.only': 'Muc do di ung khong hop le',
    'any.required': 'Muc do di ung la bat buoc',
  }),
}).or('drugId', 'drugName').messages({
  'object.missing': 'Vui long cung cap ID thuoc hoac Ten thuoc',
})

const updateAllergySchema = Joi.object({
  drugId: Joi.string().guid().optional().messages({
    'string.guid': 'ID thuoc khong hop le',
  }),
  drugName: Joi.string().trim().min(1).max(150).optional().messages({
    'string.empty': 'Ten thuoc khong duoc de trong',
    'string.min': 'Ten thuoc khong duoc de trong',
    'string.max': 'Ten thuoc khong duoc vuot qua 150 ky tu',
  }),
  reactionType: Joi.string().trim().max(100).allow('', null).messages({
    'string.max': 'Loai phan ung khong duoc vuot qua 100 ky tu',
  }),
  severity: Joi.string().valid('mild', 'moderate', 'severe').optional().messages({
    'any.only': 'Muc do di ung khong hop le',
  }),
}).min(1).messages({
  'object.min': 'Can cung cap it nhat mot truong de cap nhat',
})

const idParamSchema = Joi.object({
  id: Joi.string().guid().required().messages({
    'string.guid': 'ID di ung khong hop le',
    'any.required': 'ID di ung la bat buoc',
  }),
})

router.get('/', authenticate, allergyController.getAllergies)
router.get('/drugs', authenticate, allergyController.searchDrugs)
router.post('/', authenticate, validate(createAllergySchema), allergyController.addAllergy)
router.put('/:id', authenticate, validate({ params: idParamSchema, body: updateAllergySchema }), allergyController.updateAllergy)
router.delete('/:id', authenticate, validate({ params: idParamSchema }), allergyController.deleteAllergy)

module.exports = router

