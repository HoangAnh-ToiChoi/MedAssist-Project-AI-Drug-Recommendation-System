const { Router } = require('express')
const Joi = require('joi')
const authenticate = require('../middlewares/auth')
const validate = require('../middlewares/validate')

const HistoryController = require('../controllers/HistoryController')
const HistoryService = require('../services/HistoryService')
const PatientHistoryRepository = require('../repositories/PatientHistoryRepository')

const pool = require('../config/db')

const router = Router()

const patientHistoryRepo = new PatientHistoryRepository(pool)
const historyService = new HistoryService(patientHistoryRepo)
const historyController = new HistoryController(historyService)

const idSchema = Joi.object({
  id: Joi.string().guid().required().messages({
    'string.guid': 'ID tiền sử bệnh không hợp lệ',
    'any.required': 'ID tiền sử bệnh là bắt buộc',
  }),
})

const createHistorySchema = Joi.object({
  condition: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Tên bệnh không được để trống',
    'string.min': 'Tên bệnh không được để trống',
    'string.max': 'Tên bệnh không được vượt quá 200 ký tự',
    'any.required': 'Tên bệnh là bắt buộc',
  }),
  status: Joi.string().valid('active', 'remission', 'chronic').default('active').messages({
    'any.only': 'Trạng thái bệnh không hợp lệ',
  }),
  diagnosedAt: Joi.date().iso().allow(null).messages({
    'date.format': 'Ngày chẩn đoán phải đúng định dạng ISO',
  }),
  notes: Joi.string().trim().allow('', null),
})

const updateHistorySchema = Joi.object({
  condition: Joi.string().trim().min(1).max(200).messages({
    'string.empty': 'Tên bệnh không được để trống',
    'string.min': 'Tên bệnh không được để trống',
    'string.max': 'Tên bệnh không được vượt quá 200 ký tự',
  }),
  status: Joi.string().valid('active', 'remission', 'chronic').messages({
    'any.only': 'Trạng thái bệnh không hợp lệ',
  }),
  diagnosedAt: Joi.date().iso().allow(null).messages({
    'date.format': 'Ngày chẩn đoán phải đúng định dạng ISO',
  }),
  notes: Joi.string().trim().allow('', null),
}).min(1).messages({
  'object.min': 'Cần cung cấp ít nhất một trường để cập nhật',
})

router.get('/', authenticate, historyController.getAll.bind(historyController))
router.post('/', authenticate, validate(createHistorySchema), historyController.create.bind(historyController))
router.put('/:id', authenticate, validate({ params: idSchema, body: updateHistorySchema }), historyController.update.bind(historyController))
router.delete('/:id', authenticate, validate({ params: idSchema }), historyController.remove.bind(historyController))

module.exports = router
