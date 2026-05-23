const { Router } = require('express')
const Joi = require('joi')
const authenticate = require('../middlewares/auth')
const validate = require('../middlewares/validate')

const SymptomController = require('../controllers/SymptomController')
const SymptomService = require('../services/SymptomService')
const SymptomRepository = require('../repositories/SymptomRepository')

const RecommendationController = require('../controllers/RecommendationController')
const RecommendationService = require('../services/RecommendationService')
const PatientHistoryRepository = require('../repositories/PatientHistoryRepository')
const AllergyRepository = require('../repositories/AllergyRepository')
const RecommendationRepository = require('../repositories/RecommendationRepository')

const pool = require('../config/db')
const redisClient = require('../config/redis')

const router = Router()

// ── Symptom list DI ──────────────────────────────────────────────────────────
const symptomRepo       = new SymptomRepository(pool)
const symptomService    = new SymptomService(symptomRepo, redisClient)
const symptomController = new SymptomController(symptomService)

// ── Recommendation DI ────────────────────────────────────────────────────────
const patientHistoryRepo       = new PatientHistoryRepository(pool)
const allergyRepo              = new AllergyRepository(pool)
const recommendationRepo       = new RecommendationRepository(pool)
const recommendationService    = new RecommendationService(patientHistoryRepo, allergyRepo, recommendationRepo, redisClient)
const recommendationController = new RecommendationController(recommendationService)

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
router.get('/',      authenticate, symptomController.getAll)
router.post('/check', authenticate, validate(checkSchema), recommendationController.check)

module.exports = router
