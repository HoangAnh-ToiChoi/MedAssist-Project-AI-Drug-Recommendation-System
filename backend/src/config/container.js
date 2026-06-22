const awilix = require('awilix')
const pool = require('./db')
const redisClient = require('./redis')
const emailTransporter = require('./email')
const appConfig = require('./appConfig')

// Infrastructure & Tools
const HttpAiServiceEngine = require('../services/ai/HttpAiServiceEngine')
const DatabaseFallbackEngine = require('../services/ai/DatabaseFallbackEngine')

// Repositories
const UserRepository = require('../repositories/userRepository')
const RefreshTokenRepository = require('../repositories/RefreshTokenRepository')
const PatientHistoryRepository = require('../repositories/PatientHistoryRepository')
const AllergyRepository = require('../repositories/AllergyRepository')
const RecommendationRepository = require('../repositories/RecommendationRepository')
const SymptomRepository = require('../repositories/SymptomRepository')
const CachedSymptomRepository = require('../repositories/CachedSymptomRepository')

// Services
const AuthService = require('../services/authService')
const HistoryService = require('../services/HistoryService')
const AllergyService = require('../services/AllergyService')
const SymptomService = require('../services/SymptomService')
const RecommendationService = require('../services/RecommendationService')
const ProfileService = require('../services/profileService')
const AdminService = require('../services/adminService')

// Controllers
const AuthController = require('../controllers/authController')
const HistoryController = require('../controllers/HistoryController')
const AllergyController = require('../controllers/AllergyController')
const SymptomController = require('../controllers/SymptomController')
const RecommendationController = require('../controllers/RecommendationController')
const ProfileController = require('../controllers/profileController')
const AdminController = require('../controllers/adminController')

const container = awilix.createContainer({
  injectionMode: awilix.InjectionMode.CLASSIC,
})

container.register({
  // Infrastructure connections
  pool: awilix.asValue(pool),
  redisClient: awilix.asValue(redisClient),
  redis: awilix.asValue(redisClient),
  emailTransporter: awilix.asValue(emailTransporter),

  // Strategy Engines for AI recommendation
  httpAiEngine: awilix.asFunction(() => new HttpAiServiceEngine(appConfig.ai.serviceUrl, appConfig.ai.serviceTimeoutMs)).singleton(),
  dbFallbackEngine: awilix.asClass(DatabaseFallbackEngine).singleton(),
  aiEngines: awilix.asFunction(() => [
    container.resolve('httpAiEngine'),
    container.resolve('dbFallbackEngine'),
  ]).singleton(),

  // Repositories
  userRepository: awilix.asClass(UserRepository).singleton(),
  refreshTokenRepository: awilix.asClass(RefreshTokenRepository).singleton(),
  
  patientHistoryRepository: awilix.asClass(PatientHistoryRepository).singleton(),
  patientHistoryRepo: awilix.asFunction(() => container.resolve('patientHistoryRepository')).singleton(),

  allergyRepository: awilix.asClass(AllergyRepository).singleton(),
  allergyRepo: awilix.asFunction(() => container.resolve('allergyRepository')).singleton(),

  recommendationRepository: awilix.asClass(RecommendationRepository).singleton(),
  recommendationRepo: awilix.asFunction(() => container.resolve('recommendationRepository')).singleton(),

  symptomRepositoryRaw: awilix.asClass(SymptomRepository).singleton(),
  symptomRepository: awilix.asFunction(() => new CachedSymptomRepository(
    container.resolve('symptomRepositoryRaw'),
    container.resolve('redisClient')
  )).singleton(),

  // Services
  authService: awilix.asClass(AuthService).singleton(),
  historyService: awilix.asClass(HistoryService).singleton(),
  allergyService: awilix.asClass(AllergyService).singleton(),
  symptomService: awilix.asClass(SymptomService).singleton(),
  recommendationService: awilix.asClass(RecommendationService).singleton(),
  profileService: awilix.asClass(ProfileService).singleton(),
  adminService: awilix.asClass(AdminService).singleton(),

  // Controllers
  authController: awilix.asClass(AuthController).singleton(),
  historyController: awilix.asClass(HistoryController).singleton(),
  allergyController: awilix.asClass(AllergyController).singleton(),
  symptomController: awilix.asClass(SymptomController).singleton(),
  recommendationController: awilix.asClass(RecommendationController).singleton(),
  profileController: awilix.asClass(ProfileController).singleton(),
  adminController: awilix.asClass(AdminController).singleton(),
})

module.exports = container
