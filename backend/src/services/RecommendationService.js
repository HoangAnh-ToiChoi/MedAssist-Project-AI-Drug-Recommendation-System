const axios = require('axios')
const Recommendation = require('../entities/Recommendation')
const AppError = require('../utils/AppError')
const {
  DANGER_SYMPTOM_MESSAGES,
  MAX_RECOMMENDATIONS,
} = require('../config/recommendationRules')

const RECOMMENDATION_CACHE_TTL_SECONDS = 3600
const AI_SERVICE_TIMEOUT_MS = 1500

class RecommendationService {
  #patientHistoryRepo
  #allergyRepository
  #recommendationRepo
  #redis

  constructor(patientHistoryRepo, allergyRepository, recommendationRepo, redis) {
    this.#patientHistoryRepo = patientHistoryRepo
    this.#allergyRepository = allergyRepository
    this.#recommendationRepo = recommendationRepo
    this.#redis = redis
  }

  async checkSymptoms(userId, symptoms) {
    const resolvedSymptoms = await this.#recommendationRepo.resolveSymptomCodes(symptoms)
    const normalizedSymptoms = this.#normalizeSymptoms(
      resolvedSymptoms.length > 0 ? resolvedSymptoms : symptoms
    )

    const cacheKey = this.#buildCacheKey(userId, normalizedSymptoms)
    const cached = await this.#readCache(cacheKey)
    if (cached) return cached

    const [historyEntities, allergies] = await Promise.all([
      this.#patientHistoryRepo.findChronicDiseasesByUserId(userId),
      this.#allergyRepository.findAllByUserId(userId),
    ])

    const history = historyEntities
      .map((item) => item.getCondition())
      .filter(Boolean)

    const aiResult = await this.#callAiService(normalizedSymptoms, history, allergies)

    aiResult.recommendations = this.#normalizeRecommendations(aiResult.recommendations)
      .filter((drug) => !this.#isDrugBlockedByAllergies(drug, allergies))
      .filter((drug) => !this.#isDrugContraindicatedForHistory(drug, history))

    aiResult.recommendations = this.#selectTopSafeRecommendations(aiResult.recommendations)

    const recommendation = new Recommendation({
      userId,
      inputSymptoms: {
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
      recommendations: aiResult.recommendations,
      engineVersion: aiResult.engineVersion,
      dangerAlert: aiResult.dangerAlert || null,
    }

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

  #buildCacheKey(userId, symptoms) {
    return `recommend:${userId}:${symptoms.join('-')}`
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

  async #callAiService(symptoms, history, allergies) {
    const aiUrl = process.env.AI_SERVICE_URL

    if (aiUrl) {
      try {
        const { data } = await axios.post(
          `${aiUrl}/ai/recommend`,
          {
            symptoms,
            history,
            allergies,
          },
          {
            timeout: Number(process.env.AI_SERVICE_TIMEOUT_MS) || AI_SERVICE_TIMEOUT_MS,
          }
        )

        return {
          engineVersion: data.engine_version,
          recommendations: data.recommendations,
          dangerAlert: data.danger_alert || null,
        }
      } catch (err) {
        console.warn(
          `[AI Service Warning] ${err.message}. Chuyển sang nguồn gợi ý thuốc từ cơ sở dữ liệu.`,
        )
      }
    }

    try {
      const recommendations = await this.#recommendationRepo.findRecommendedDrugsBySymptomCodes(symptoms)
      return {
        engineVersion: 'db-fallback-v1',
        dangerAlert: this.#detectDanger(symptoms),
        recommendations,
      }
    } catch (dbErr) {
      console.error('Failed to fetch recommendations from DB:', dbErr)
      throw new AppError(
        'Không thể tạo gợi ý thuốc vào lúc này. Vui lòng thử lại sau.',
        503,
        'RECOMMENDATION_UNAVAILABLE',
      )
    }
  }
}

module.exports = RecommendationService
