const { Router } = require('express')
const authenticate = require('../middlewares/auth')
const SymptomController = require('../controllers/SymptomController')
const SymptomService = require('../services/SymptomService')
const SymptomRepository = require('../repositories/SymptomRepository')
const pool = require('../config/db')
const redisClient = require('../config/redis')

const router = Router()

const symptomRepo       = new SymptomRepository(pool)
const symptomService    = new SymptomService(symptomRepo, redisClient)
const symptomController = new SymptomController(symptomService)

router.get('/', authenticate, symptomController.getAll)

module.exports = router
