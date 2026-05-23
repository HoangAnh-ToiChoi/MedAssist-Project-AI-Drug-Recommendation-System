const { Router } = require('express')
const Joi = require('joi')
const rateLimit = require('express-rate-limit')
const validate = require('../middlewares/validate')
const AuthController = require('../controllers/authController')
const AuthService = require('../services/authService')
const UserRepository = require('../repositories/userRepository')
const pool = require('../config/db')
const redisClient = require('../config/redis')
const emailTransporter = require('../config/email')

const router = Router()

const authLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 5,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút', code: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
})

const registerSchema = Joi.object({
  email:    Joi.string().email().required().messages({
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
  email:    Joi.string().email().required().messages({
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
  token:       Joi.string().required().messages({ 'any.required': 'Token là bắt buộc' }),
  newPassword: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Mật khẩu tối thiểu 8 ký tự',
    'any.required': 'Mật khẩu mới là bắt buộc',
  }),
})

const refreshSchema = Joi.object({
  refreshToken: Joi.string().max(512).required().messages({ 'any.required': 'Refresh token là bắt buộc' }),
})

// Dependency injection
const userRepo       = new UserRepository(pool)
const authService    = new AuthService(userRepo, redisClient, emailTransporter)
const authController = new AuthController(authService)

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp:   Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length':  'Mã OTP gồm 6 chữ số',
    'string.pattern': 'Mã OTP chỉ gồm chữ số',
  }),
})

const resendOtpSchema = Joi.object({
  email: Joi.string().email().required(),
})

router.post('/register',        authLimiter, validate(registerSchema),        authController.register)
router.post('/verify-otp',      authLimiter, validate(verifyOtpSchema),       authController.verifyOtp)
router.post('/resend-otp',      authLimiter, validate(resendOtpSchema),       authController.resendOtp)
router.post('/login',           authLimiter, validate(loginSchema),           authController.login)
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema),  authController.forgotPassword)
router.post('/reset-password',              validate(resetPasswordSchema),    authController.resetPassword)
router.post('/refresh',         authLimiter, validate(refreshSchema),          authController.refresh)
router.post('/logout',          authLimiter, validate(refreshSchema),          authController.logout)

module.exports = router
