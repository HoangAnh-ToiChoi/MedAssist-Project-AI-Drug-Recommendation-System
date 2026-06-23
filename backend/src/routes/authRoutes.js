const { Router } = require('express')
const Joi = require('joi')
const rateLimit = require('express-rate-limit')
const validate = require('../middlewares/validate')
const container = require('../config/container')

const router = Router()

const authLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 30 giây',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Mật khẩu tối thiểu 8 ký tự',
    'string.max': 'Mật khẩu tối đa 128 ký tự',
    'any.required': 'Mật khẩu là bắt buộc',
  }),
  fullName: Joi.string().min(2).max(100).trim().required().messages({
    'string.min': 'Họ tên tối thiểu 2 ký tự',
    'any.required': 'Họ tên là bắt buộc',
  }),
})

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Mật khẩu là bắt buộc',
  }),
})

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc',
  }),
})

const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Token là bắt buộc',
  }),
  newPassword: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Mật khẩu tối thiểu 8 ký tự',
    'any.required': 'Mật khẩu mới là bắt buộc',
  }),
})

const refreshSchema = Joi.object({
  refreshToken: Joi.string().max(512).required().messages({
    'any.required': 'Refresh token là bắt buộc',
  }),
})

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().trim().required().messages({
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc',
  }),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'Mã OTP gồm 6 chữ số',
    'string.pattern.base': 'Mã OTP chỉ gồm chữ số',
    'any.required': 'Mã OTP là bắt buộc',
  }),
})

const resendOtpSchema = Joi.object({
  email: Joi.string().email().trim().required().messages({
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc',
  }),
})

const authController = container.resolve('authController')

router.post('/register', authLimiter, validate(registerSchema), authController.register.bind(authController))
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), authController.verifyOtp.bind(authController))
router.post('/resend-otp', authLimiter, validate(resendOtpSchema), authController.resendOtp.bind(authController))
router.post('/login', authLimiter, validate(loginSchema), authController.login.bind(authController))
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword.bind(authController))
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword.bind(authController))
router.post('/refresh', authLimiter, validate(refreshSchema), authController.refresh.bind(authController))
router.post('/logout', authLimiter, validate(refreshSchema), authController.logout.bind(authController))

module.exports = router
