const { Router } = require('express')
const Joi = require('joi')
const authenticate = require('../middlewares/auth')
const authorizeRoles = require('../middlewares/authorize')
const validate = require('../middlewares/validate')
const container = require('../config/container')

const router = Router()
const adminController = container.resolve('adminController')

// ── Joi Schemas ──────────────────────────────────────────────────────────────

const idParamSchema = Joi.object({
  id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
    'string.guid': 'ID người dùng phải là UUID hợp lệ',
    'any.required': 'ID người dùng là bắt buộc',
  }),
})

const updateStatusBodySchema = Joi.object({
  isActive: Joi.boolean().required().messages({
    'boolean.base': 'isActive phải là kiểu boolean (true/false)',
    'any.required': 'isActive là bắt buộc',
  }),
})

// ── Routes ───────────────────────────────────────────────────────────────────

// GET  /api/v1/admin/users               — Xem danh sách tất cả người dùng (Admin)
router.get(
  '/users',
  authenticate,
  authorizeRoles('admin'),
  adminController.getUsers.bind(adminController)
)

// PATCH /api/v1/admin/users/:id/status   — Kích hoạt / Vô hiệu hóa tài khoản (Admin)
router.patch(
  '/users/:id/status',
  authenticate,
  authorizeRoles('admin'),
  validate({ params: idParamSchema, body: updateStatusBodySchema }),
  adminController.updateUserStatus.bind(adminController)
)

module.exports = router
