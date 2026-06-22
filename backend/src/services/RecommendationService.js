const Recommendation = require('../entities/Recommendation')
const AppError = require('../utils/AppError')
const appConfig = require('../config/appConfig')
const logger = require('../utils/logger')
const {
  DANGER_SYMPTOM_MESSAGES,
  MAX_RECOMMENDATIONS,
} = require('../config/recommendationRules')

const RECOMMENDATION_CACHE_TTL_SECONDS = appConfig.cache.recommendationTtlSeconds

class RecommendationService {
  #patientHistoryRepo
  #allergyRepository
  #recommendationRepo
  #redis
  #aiEngines

  constructor(patientHistoryRepo, allergyRepository, recommendationRepo, redis, aiEngines) {
    if (arguments.length === 1 && typeof arguments[0] === 'object' && arguments[0] !== null) {
      const deps = arguments[0]
      this.#patientHistoryRepo = deps.patientHistoryRepo
      this.#allergyRepository = deps.allergyRepository || deps.allergyRepo
      this.#recommendationRepo = deps.recommendationRepo
      this.#redis = deps.redis || deps.redisClient
      this.#aiEngines = deps.aiEngines
    } else {
      this.#patientHistoryRepo = patientHistoryRepo
      this.#allergyRepository = allergyRepository
      this.#recommendationRepo = recommendationRepo
      this.#redis = redis
      this.#aiEngines = aiEngines
    }

    if (!this.#aiEngines) {
      const DatabaseFallbackEngine = require('./ai/DatabaseFallbackEngine')
      this.#aiEngines = [new DatabaseFallbackEngine(this.#recommendationRepo)]
    }
  }

  async checkSymptoms(userId, specialty, symptoms) {
    const normalizedSpecialty = this.#normalizeSpecialty(specialty)
    if (!normalizedSpecialty) {
      throw new AppError('Specialty la bat buoc.', 400, 'SPECIALTY_REQUIRED')
    }

    const resolvedSymptoms = await this.#resolveSymptomsWithinSpecialty(
      normalizedSpecialty,
      symptoms
    )
    const normalizedSymptoms = this.#normalizeSymptoms(
      resolvedSymptoms.length > 0 ? resolvedSymptoms : symptoms
    )

    const cacheKey = this.#buildCacheKey(userId, normalizedSpecialty, normalizedSymptoms)
    const cached = await this.#readCache(cacheKey)
    if (cached) return cached

    const [historyEntities, allergies] = await Promise.all([
      this.#patientHistoryRepo.findChronicDiseasesByUserId(userId),
      this.#allergyRepository.findAllByUserId(userId),
    ])

    const history = historyEntities
      .map((item) => item.getCondition())
      .filter(Boolean)

    const aiResult = await this.#callAiService(
      normalizedSpecialty,
      normalizedSymptoms,
      history,
      allergies
    )

    aiResult.recommendations = this.#normalizeRecommendations(aiResult.recommendations)
      .filter((drug) => !this.#isDrugBlockedByAllergies(drug, allergies))
      .filter((drug) => !this.#isDrugContraindicatedForHistory(drug, history))

    aiResult.recommendations = this.#selectTopSafeRecommendations(aiResult.recommendations)

    const recommendation = new Recommendation({
      userId,
      inputSymptoms: {
        specialty: normalizedSpecialty,
        symptoms: normalizedSymptoms,
        history,
        allergies,
      },
      outputDrugs: aiResult.recommendations,
      dangerAlert: aiResult.dangerAlert || null,
      aiVersion: aiResult.engineVersion,
    })

    const saved = await this.#recommendationRepo.save(recommendation)
    const result = {
      id: saved.id,
      specialty: normalizedSpecialty,
      matchedSymptoms: this.#normalizeSymptoms(aiResult.matchedSymptoms || normalizedSymptoms),
      topDiseases: Array.isArray(aiResult.topDiseases) ? aiResult.topDiseases : [],
      recommendations: aiResult.recommendations,
      engineVersion: aiResult.engineVersion,
      dangerAlert: aiResult.dangerAlert || null,
    }

    result.llmExplanation = await this.#buildGroundedExplanation({
      specialty: result.specialty,
      inputSymptoms: normalizedSymptoms,
      matchedSymptoms: result.matchedSymptoms,
      topDiseases: result.topDiseases,
      recommendations: result.recommendations,
      history,
      allergies,
      dangerAlert: result.dangerAlert,
      engineVersion: result.engineVersion,
    })

    await this.#writeCache(cacheKey, result)
    return result
  }

  #normalizeSymptoms(symptoms) {
    return [...new Set(
      symptoms
        .map((item) => String(item || '').trim().toLowerCase())
        .filter(Boolean)
    )].sort()
  }

  #normalizeSpecialty(specialty) {
    return String(specialty || '').trim().toLowerCase()
  }

  async #resolveSymptomsWithinSpecialty(specialty, symptoms) {
    if (typeof this.#recommendationRepo.resolveSymptomCodesWithinSpecialty === 'function') {
      return this.#recommendationRepo.resolveSymptomCodesWithinSpecialty(specialty, symptoms)
    }

    if (typeof this.#recommendationRepo.resolveSymptomCodes === 'function') {
      return this.#recommendationRepo.resolveSymptomCodes(symptoms)
    }

    return []
  }

  #buildCacheKey(userId, specialty, symptoms) {
    return `recommend:${userId}:${specialty}:${symptoms.join('-')}`
  }

  async #readCache(cacheKey) {
    try {
      const cached = await this.#redis.get(cacheKey)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }

  async #writeCache(cacheKey, value) {
    try {
      await this.#redis.setEx(cacheKey, RECOMMENDATION_CACHE_TTL_SECONDS, JSON.stringify(value))
    } catch {}
  }

  #normalizeRecommendations(recommendations) {
    return Array.isArray(recommendations) ? recommendations : []
  }

  #normalizeDrugName(drugName) {
    return String(drugName || '').trim().toLowerCase()
  }

  #selectTopSafeRecommendations(recommendations) {
    return this.#normalizeRecommendations(recommendations)
      .filter((drug) => Number(drug.confidence || 0) > 0)
      .sort((first, second) => Number(second.confidence || 0) - Number(first.confidence || 0))
      .slice(0, MAX_RECOMMENDATIONS)
  }

  #isDrugBlockedByAllergies(drug, allergies) {
    return allergies.some((allergy) => {
      if (allergy && typeof allergy.isAllergicTo === 'function') {
        return allergy.isAllergicTo(drug)
      }

      const normalizedAllergy = this.#normalizeDrugName(
        allergy?.name || allergy?.drug_name || allergy?.genericName || allergy?.generic_name || allergy
      )

      if (!normalizedAllergy) return false

      return [drug.name, drug.drug_name, drug.generic_name]
        .map((name) => this.#normalizeDrugName(name))
        .filter(Boolean)
        .some((drugName) =>
          drugName === normalizedAllergy ||
          drugName.includes(normalizedAllergy) ||
          normalizedAllergy.includes(drugName)
        )
    })
  }

  #isDrugContraindicatedForHistory(drug, history) {
    if (!history || history.length === 0) return false

    const normalizedContraindications = this.#cleanString(drug.contraindications)
    if (!normalizedContraindications) return false

    return history.some((condition) => {
      const normalizedCondition = this.#cleanString(condition)
      if (!normalizedCondition) return false

      if (
        normalizedContraindications.includes(normalizedCondition) ||
        normalizedCondition.includes(normalizedContraindications)
      ) {
        return true
      }

      const ignoreWords = ['khong', 'dung', 'uong', 'kem', 'hoac', 'tren', 'duoi', 'nhe', 'nhat', 'mang', 'tinh']
      const conditionWords = normalizedCondition
        .split(/\s+/)
        .filter((word) => !ignoreWords.includes(word))
        .filter((word) => word.length >= 4 || ['gan', 'than', 'tim', 'hen', 'say', 'mat', 'ngu', 'sot'].includes(word))

      if (conditionWords.some((word) => normalizedContraindications.includes(word))) {
        return true
      }

      return ['da day'].some((keyword) =>
        normalizedCondition.includes(keyword) && normalizedContraindications.includes(keyword)
      )
    })
  }

  #cleanString(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  }

  #detectDanger(symptomCodes) {
    for (const code of symptomCodes) {
      if (DANGER_SYMPTOM_MESSAGES[code]) {
        return `Cảnh báo y tế: ${DANGER_SYMPTOM_MESSAGES[code]} Thông tin gợi ý dưới đây chỉ mang tính tham khảo.`
      }
    }

    return null
  }

  async #callAiService(specialty, symptoms, history, allergies) {
    if (!this.#aiEngines || this.#aiEngines.length === 0) {
      throw new AppError(
        'Không thể tạo gợi ý thuốc vào lúc này. Vui lòng thử lại sau.',
        503,
        'RECOMMENDATION_UNAVAILABLE',
      )
    }

    const errors = []
    for (const engine of this.#aiEngines) {
      try {
        const result = await engine.getRecommendations(
          specialty,
          symptoms,
          history,
          allergies
        )
        if (result) {
          return result
        }
      } catch (err) {
        errors.push(err.message)
        logger.warn(
          `[AI Engine Warning] Engine ${engine.constructor.name} failed: ${err.message}. Trying next engine...`
        )
      }
    }

    logger.error('All recommendation engines failed:', { errors })
    throw new AppError(
      'Không thể tạo gợi ý thuốc vào lúc này. Vui lòng thử lại sau.',
      503,
      'RECOMMENDATION_UNAVAILABLE',
    )
  }

  async #buildGroundedExplanation(payload) {
    const explainEngine = this.#aiEngines.find(
      (engine) => typeof engine?.explainGroundedRecommendation === 'function'
    )

    if (!explainEngine) {
      return this.#buildFallbackExplanation(payload, {
        enabled: false,
        status: 'disabled',
        provider: null,
      })
    }

    try {
      const explanation = await explainEngine.explainGroundedRecommendation(payload)
      if (!explanation) {
        return this.#buildFallbackExplanation(payload, {
          enabled: false,
          status: 'disabled',
          provider: null,
        })
      }

      return this.#normalizeLlmExplanation(explanation, payload, this.#resolveExplanationProvider(explainEngine))
    } catch (err) {
      logger.warn(
        `[AI Explanation Warning] Engine ${explainEngine.constructor.name} failed: ${err.message}. Using deterministic fallback explanation.`
      )

      return this.#buildFallbackExplanation(payload, {
        enabled: true,
        status: 'fallback',
        provider: this.#resolveExplanationProvider(explainEngine),
        error: err.message,
      })
    }
  }

  #normalizeLlmExplanation(explanation, payload, fallbackProvider) {
    if (!explanation || typeof explanation !== 'object') {
      return this.#buildFallbackExplanation(payload, {
        enabled: true,
        status: 'fallback',
        provider: fallbackProvider,
        error: 'AI explanation returned an invalid payload.',
      })
    }

    return {
      enabled: explanation.enabled ?? true,
      status: explanation.status || 'success',
      provider: explanation.provider || fallbackProvider || null,
      summary: String(explanation.summary || '').trim() || this.#buildFallbackSummary(payload),
      explanation: String(explanation.explanation || '').trim() || this.#buildFallbackNarrative(payload),
      safetyNote: String(explanation.safetyNote || '').trim() || this.#buildSafetyNote(payload),
      ...(explanation.error ? { error: String(explanation.error) } : {}),
    }
  }

  #buildFallbackExplanation(payload, options = {}) {
    const explanation = {
      enabled: options.enabled ?? false,
      status: options.status || 'disabled',
      provider: options.provider || null,
      summary: this.#buildFallbackSummary(payload),
      explanation: this.#buildFallbackNarrative(payload),
      safetyNote: this.#buildSafetyNote(payload),
    }

    if (options.error) {
      explanation.error = String(options.error)
    }

    return explanation
  }

  #buildFallbackSummary(payload) {
    const matchedSymptoms = Array.isArray(payload.matchedSymptoms) ? payload.matchedSymptoms : []
    const recommendationCount = Array.isArray(payload.recommendations) ? payload.recommendations.length : 0

    if (matchedSymptoms.length === 0) {
      return `Recommendations were finalized for specialty ${payload.specialty} with ${recommendationCount} safe option(s).`
    }

    return `Recommendations were finalized for specialty ${payload.specialty} using ${matchedSymptoms.length} matched symptom(s) and ${recommendationCount} safe option(s).`
  }

  #buildFallbackNarrative(payload) {
    const diseaseNames = Array.isArray(payload.topDiseases)
      ? payload.topDiseases
        .map((disease) => disease?.displayName || disease?.name || disease?.code)
        .filter(Boolean)
        .slice(0, 3)
      : []

    const diseaseClause = diseaseNames.length > 0
      ? `Likely related conditions included ${diseaseNames.join(', ')}. `
      : ''

    return `${diseaseClause}The backend kept the grounded result authoritative, then removed allergy conflicts and history contraindications before ranking the remaining medications by confidence.`
  }

  #buildSafetyNote(payload) {
    if (payload.dangerAlert) {
      return payload.dangerAlert
    }

    return 'This explanation is informational only and does not replace evaluation by a qualified clinician.'
  }

  #resolveExplanationProvider(engine) {
    if (!engine) return null
    if (typeof engine.provider === 'string' && engine.provider.trim()) {
      return engine.provider.trim()
    }

    return engine.constructor?.name || 'unknown'
  }
}

module.exports = RecommendationService
