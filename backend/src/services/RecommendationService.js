const axios = require('axios')
const Recommendation = require('../entities/Recommendation')

const RECOMMENDATION_CACHE_TTL_SECONDS = 3600
const AI_SERVICE_TIMEOUT_MS = 1500
const MAX_RECOMMENDATIONS = 5

class RecommendationService {
  #patientHistoryRepo
  #allergyRepository
  #recommendationRepo
  #redis

  constructor(patientHistoryRepo, allergyRepository, recommendationRepo, redis) {
    this.#patientHistoryRepo = patientHistoryRepo
    this.#allergyRepository = allergyRepository
    this.allergyRepository = allergyRepository
    this.#recommendationRepo = recommendationRepo
    this.#redis = redis
  }

  async checkSymptoms(userId, symptoms) {
    const resolvedSymptoms = await this.#recommendationRepo.resolveSymptomCodes(symptoms)
    const normalizedSymptoms = this.#normalizeSymptoms(resolvedSymptoms.length > 0 ? resolvedSymptoms : symptoms)

    const cacheKey = this.#buildCacheKey(userId, normalizedSymptoms)
    const cached = await this.#readCache(cacheKey)
    if (cached) return cached

    const [historyEntities, allergies] = await Promise.all([
      this.#patientHistoryRepo.findChronicDiseasesByUserId(userId),
      this.allergyRepository.findAllByUserId(userId),
    ])

    const history = historyEntities
      .map((item) => item.getCondition())
      .filter(Boolean)

    const aiResult = await this.#callAiService(normalizedSymptoms, history, allergies)

    // Apply defense-in-depth filter: remove drug recommendations if drug name matches user's allergies
    if (aiResult.recommendations && Array.isArray(aiResult.recommendations)) {
      aiResult.recommendations = aiResult.recommendations.filter((drug) => {
        const drugNames = [drug.name, drug.drug_name, drug.generic_name]
          .map((name) => String(name || '').trim().toLowerCase())
          .filter(Boolean)

        const normalizedAllergies = allergies
          .map((allergy) => {
            if (typeof allergy === 'string') {
              return allergy.trim().toLowerCase()
            }
            return String(allergy.name || allergy.drug_name || allergy.genericName || allergy.generic_name || '').trim().toLowerCase()
          })
          .filter(Boolean)

        return !drugNames.some((drugName) =>
          normalizedAllergies.some((allergy) =>
            drugName === allergy || drugName.includes(allergy) || allergy.includes(drugName)
          )
        )
      })
    }

    // Apply medical history contraindications filter: remove drug recommendations if user's history condition matches drug's contraindications
    if (history && history.length > 0 && aiResult.recommendations && Array.isArray(aiResult.recommendations)) {
      const cleanString = (str) =>
        String(str || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()

      aiResult.recommendations = aiResult.recommendations.filter((drug) => {
        const normContra = cleanString(drug.contraindications)
        if (!normContra) return true

        const isContraindicated = history.some((condition) => {
          const normCond = cleanString(condition)
          if (!normCond) return false

          // 1. Substring match
          if (normContra.includes(normCond) || normCond.includes(normContra)) {
            return true
          }

          // 2. Dynamic word overlap match (excluding common helper words)
          const ignoreWords = ['khong', 'dung', 'uong', 'kem', 'hoac', 'tren', 'duoi', 'nhe', 'nhat', 'mang', 'tinh']
          const condWords = normCond.split(/\s+/)
            .filter((word) => !ignoreWords.includes(word))
            .filter((word) => word.length >= 4 || ['gan', 'than', 'tim', 'hen', 'say', 'mat', 'ngu', 'sot'].includes(word))

          const hasOverlap = condWords.some((word) => normContra.includes(word))
          if (hasOverlap) {
            return true
          }

          // 3. Fallback for compound organ keywords (e.g. da day)
          const keywords = ['da day']
          for (const kw of keywords) {
            if (normCond.includes(kw) && normContra.includes(kw)) {
              return true
            }
          }

          return false
        })

        return !isContraindicated
      })
    }

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

  #normalizeDrugName(drugName) {
    return String(drugName || '').trim().toLowerCase()
  }

  #selectTopSafeRecommendations(recommendations) {
    return recommendations
      .filter((drug) => Number(drug.confidence || 0) > 0)
      .sort((first, second) => Number(second.confidence || 0) - Number(first.confidence || 0))
      .slice(0, MAX_RECOMMENDATIONS)
  }

  #detectDanger(symptomCodes) {
    const dangerMessages = {
      'kho_tho': 'Khó thở có thể là dấu hiệu bệnh phổi hoặc tim mạch. Đến cơ sở y tế ngay.',
      'dau_nguc': 'Đau ngực có thể là triệu chứng nhồi máu cơ tim. Gọi 115 ngay!',
    }
    for (const code of symptomCodes) {
      if (dangerMessages[code]) {
        return `⚠️ Cảnh báo y tế: ${dangerMessages[code]} Thông tin gợi ý dưới đây chỉ mang tính tham khảo.`
      }
    }
    return null
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

    try {
      const recommendations = await this.#recommendationRepo.findRecommendedDrugsBySymptomCodes(symptoms)
      return {
        engineVersion: 'db-fallback-v1',
        dangerAlert: this.#detectDanger(symptoms),
        recommendations,
      }
    } catch (dbErr) {
      console.error('Failed to fetch recommendations from DB:', dbErr)
      return {
        engineVersion: 'empty-v1',
        dangerAlert: null,
        recommendations: [],
      }
    }
  }
}

module.exports = RecommendationService
