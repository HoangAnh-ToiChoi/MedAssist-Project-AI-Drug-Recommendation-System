const { Router } = require('express')
const Joi = require('joi')
const authenticate = require('../middlewares/auth')
const validate = require('../middlewares/validate')
const container = require('../config/container')

const router = Router()
const chatbotController = container.resolve('chatbotController')

const groundedChatSchema = Joi.object({
  recommendationId: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Recommendation ID là bắt buộc',
    'string.min': 'Recommendation ID là bắt buộc',
    'any.required': 'Recommendation ID là bắt buộc',
  }),
  question: Joi.string().trim().min(1).max(1000).required().messages({
    'string.empty': 'Câu hỏi là bắt buộc',
    'string.min': 'Câu hỏi là bắt buộc',
    'string.max': 'Câu hỏi không được vượt quá 1000 ký tự',
    'any.required': 'Câu hỏi là bắt buộc',
  }),
  specialty: Joi.string().trim().min(1).optional(),
  matchedSymptoms: Joi.array().items(Joi.string().trim().min(1)).optional(),
  topDiseases: Joi.array().items(Joi.object({
    id: Joi.string().optional(),
    code: Joi.string().trim().min(1).required(),
    displayName: Joi.string().trim().min(1).required(),
    icd10Code: Joi.string().trim().allow('', null).optional(),
    score: Joi.number().min(0).max(1).required(),
  })).optional(),
  recommendations: Joi.array().items(Joi.object({
    name: Joi.string().trim().min(1).required(),
    generic_name: Joi.string().trim().allow('', null).optional(),
    confidence: Joi.number().min(0).max(1).required(),
    reason: Joi.string().trim().allow('', null).optional(),
    dosage: Joi.string().trim().allow('', null).optional(),
    contraindications: Joi.string().trim().allow('', null).optional(),
  })).optional(),
  dangerAlert: Joi.string().trim().allow('', null).optional(),
  conversation: Joi.array().items(Joi.object({
    role: Joi.string().valid('user', 'assistant').required(),
    content: Joi.string().trim().min(1).max(2000).required(),
  })).optional(),
})

router.post(
  '/recommendation',
  authenticate,
  validate(groundedChatSchema),
  chatbotController.chatOnRecommendation.bind(chatbotController)
)

module.exports = router
