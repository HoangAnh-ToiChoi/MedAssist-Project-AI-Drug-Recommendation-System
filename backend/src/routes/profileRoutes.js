const { Router } = require('express')
const Joi = require('joi')
const authenticate = require('../middlewares/auth')
const validate = require('../middlewares/validate')
const container = require('../config/container')

const router = Router()
const profileController = container.resolve('profileController')

const updateProfileSchema = Joi.object({
  fullName: Joi.string().trim().max(100).required().messages({
    'string.empty': 'Họ và tên không được để trống',
    'any.required': 'Họ và tên là bắt buộc',
  }),
  dateOfBirth: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, '').messages({
    'string.pattern.base': 'Ngày sinh phải đúng định dạng YYYY-MM-DD',
  }),
  gender: Joi.string().valid('Male', 'Female', 'Other', 'male', 'female', 'other').allow(null, '').messages({
    'any.only': 'Giới tính chỉ nhận các giá trị: Male, Female, Other',
  }),
  phoneNumber: Joi.string().trim().pattern(/^(0|\+84)[35789]\d{8}$/).allow(null, '').messages({
    'string.pattern.base': 'Số điện thoại không hợp lệ',
  }),
})

router.get('/', authenticate, profileController.getProfile.bind(profileController))
router.put('/', authenticate, validate(updateProfileSchema), profileController.updateProfile.bind(profileController))

module.exports = router
