const axios = require('axios')
const Recommendation = require('../entities/Recommendation')

const RECOMMENDATION_CACHE_TTL_SECONDS = 3600
const AI_SERVICE_TIMEOUT_MS = 1500
const MAX_RECOMMENDATIONS = 5

class RecommendationService {
  #patientHistoryRepo
  #allergyRepo
  #recommendationRepo
  #redis

  constructor(patientHistoryRepo, allergyRepo, recommendationRepo, redis) {
    this.#patientHistoryRepo = patientHistoryRepo
    this.#allergyRepo = allergyRepo
    this.#recommendationRepo = recommendationRepo
    this.#redis = redis
  }

  async checkSymptoms(userId, symptoms) {
    const normalizedSymptoms = this.#normalizeSymptoms(symptoms)
    const cacheKey = this.#buildCacheKey(userId, normalizedSymptoms)
    const cached = await this.#readCache(cacheKey)
    if (cached) return cached

    const [historyEntities, allergyEntities] = await Promise.all([
      this.#patientHistoryRepo.findChronicDiseasesByUserId(userId),
      this.#allergyRepo.findAllByUserId(userId),
    ])

    const history = historyEntities
      .map((item) => item.getCondition())
      .filter(Boolean)

    const allergiesForAi = allergyEntities
      .map((item) => item.name || item.genericName)
      .filter(Boolean)

    const aiResult = await this.#callAiService(normalizedSymptoms, history, allergiesForAi)
    const recommendations = this.#normalizeRecommendations(aiResult.recommendations)
    const filteredRecommendations = this.#selectTopSafeRecommendations(
      this.#filterAllergies(recommendations, allergyEntities)
    )

    const recommendation = new Recommendation({
      userId,
      inputSymptoms: {
        symptoms: normalizedSymptoms,
        history,
        allergies: allergiesForAi,
      },
      outputDrugs: filteredRecommendations,
      dangerAlert: aiResult.dangerAlert || null,
      aiVersion: aiResult.engineVersion,
    })

    const saved = await this.#recommendationRepo.save(recommendation)
    const result = {
      id: saved.id,
      recommendations: filteredRecommendations,
      engineVersion: aiResult.engineVersion,
    }

    await this.#writeCache(cacheKey, result)
    return result
  }

  #normalizeSymptoms(symptoms) {
    return [...new Set(
      symptoms
        .map((item) => item.trim())
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

  #filterAllergies(recommendations, allergyEntities) {
    if (!recommendations.length || !allergyEntities.length) return recommendations

    return recommendations.filter((drug) =>
      !allergyEntities.some((allergy) => allergy.isAllergicTo(drug))
    )
  }

  #selectTopSafeRecommendations(recommendations) {
    return recommendations
      .filter((drug) => Number(drug.confidence || 0) > 0)
      .sort((first, second) => Number(second.confidence || 0) - Number(first.confidence || 0))
      .slice(0, MAX_RECOMMENDATIONS)
  }

  async #callAiService(symptoms, history, allergies) {
    const aiUrl = process.env.AI_SERVICE_URL
    if (aiUrl) {
      try {
        const { data } = await axios.post(`${aiUrl}/ai/recommend`, {
          symptoms,
          history,
          allergies,
        }, {
          timeout: Number(process.env.AI_SERVICE_TIMEOUT_MS) || AI_SERVICE_TIMEOUT_MS,
        })

        return {
          engineVersion: data.engine_version,
          recommendations: data.recommendations,
          dangerAlert: data.danger_alert || null,
        }
      } catch (err) {
        console.warn(`[AI Service Connection Warning] ${err.message}. Tự động fallback sang Mock dữ liệu mẫu để tiếp tục trải nghiệm.`)
      }
    }

    return {
      engineVersion: 'mock-v0',
      dangerAlert: null,
      recommendations: [
        {
          name: 'Paracetamol 500mg',
          generic_name: 'Paracetamol',
          confidence: 0.90,
          category: 'Giảm đau - Hạ sốt',
          reason: 'Phù hợp với triệu chứng sốt và đau đầu. Không có tương tác với thuốc đang dùng.',
          description: 'Thuốc giảm đau hạ sốt thông thường, an toàn cho hầu hết người dùng.',
          dosage: '500mg - 1g mỗi 4-6 giờ, tối đa 4g/ngày',
          contraindications: 'Suy gan nặng, dị ứng Paracetamol',
        },
        {
          name: 'Ibuprofen 400mg',
          generic_name: 'Ibuprofen',
          confidence: 0.72,
          category: 'NSAIDs - Kháng viêm',
          reason: 'Có tác dụng hạ sốt và giảm đau đầu hiệu quả.',
          description: 'Thuốc kháng viêm không steroid, hạ sốt và giảm đau.',
          dosage: '400mg mỗi 6-8 giờ sau ăn',
          contraindications: 'Loét dạ dày, suy thận nặng',
        },
      ],
    }
  }
}

module.exports = RecommendationService
