const AppError = require('../utils/AppError')
const { invalidateRecommendationCache } = require('../utils/recommendationCache')

class AllergyService {
  #allergyRepository
  #redis

  constructor(allergyRepository, redisClient) {
    this.#allergyRepository = allergyRepository
    this.#redis = redisClient
  }

  async getAllergies(userId) {
    return this.#allergyRepository.getAllergiesDetailsByUserId(userId)
  }

  async addAllergy(userId, allergyData) {
    let { drugId, drugName, reactionType, severity } = allergyData

    if (!drugId && drugName) {
      drugId = await this.#resolveDrugId(drugName)
    }

    try {
      const result = await this.#allergyRepository.createAllergy({
        userId,
        drugId,
        reactionType,
        severity,
      })

      await this.#invalidateCache(userId)
      return result
    } catch (err) {
      if (err?.code === '23505') {
        throw new AppError(
          'Thuốc này đã có trong danh sách dị ứng',
          409,
          'ALLERGY_ALREADY_EXISTS',
        )
      }

      if (err?.code === '23503') {
        throw new AppError(
          'Thuốc không tồn tại',
          404,
          'DRUG_NOT_FOUND',
        )
      }

      throw err
    }
  }

  async searchDrugs(query) {
    return this.#allergyRepository.searchDrugs(query)
  }

  async updateAllergy(id, userId, allergyData) {
    let { drugId, drugName, reactionType, severity } = allergyData

    if (!drugId && drugName) {
      drugId = await this.#resolveDrugId(drugName)
    }

    try {
      const result = await this.#allergyRepository.updateAllergy({
        id,
        userId,
        drugId,
        reactionType,
        severity,
      })

      if (!result) {
        throw new AppError('Không tìm thấy dị ứng thuốc này để cập nhật', 404, 'ALLERGY_NOT_FOUND')
      }

      await this.#invalidateCache(userId)
      return result
    } catch (err) {
      if (err?.code === '23505') {
        throw new AppError(
          'Thuốc này đã có trong danh sách dị ứng',
          409,
          'ALLERGY_ALREADY_EXISTS',
        )
      }
      throw err
    }
  }

  async deleteAllergy(userId, id) {
    const deleted = await this.#allergyRepository.deleteAllergy(userId, id)
    if (!deleted) {
      throw new AppError('Không tìm thấy dị ứng thuốc này để xóa', 404, 'ALLERGY_NOT_FOUND')
    }
    await this.#invalidateCache(userId)
    return { success: true }
  }

  #getSimilarity(s1, s2) {
    const str1 = s1.toLowerCase().replace(/[^a-z0-9]/g, '')
    const str2 = s2.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (str1 === str2) return 1.0
    if (str1.length < 2 || str2.length < 2) return 0.0

    const getBigrams = (str) => {
      const bigrams = new Set()
      for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.substring(i, i + 2))
      }
      return bigrams
    }

    const bigrams1 = getBigrams(str1)
    const bigrams2 = getBigrams(str2)
    let intersection = 0
    for (const val of bigrams1) {
      if (bigrams2.has(val)) intersection++
    }
    return (2.0 * intersection) / (bigrams1.size + bigrams2.size)
  }

  async #resolveDrugId(drugName) {
    if (!drugName || !drugName.trim()) {
      throw new AppError('Tên thuốc không được để trống', 400, 'DRUG_NAME_REQUIRED')
    }

    const cleanInput = drugName.trim().toLowerCase()
    const allDrugs = await this.#allergyRepository.getAllDrugs()

    let bestMatch = null
    let maxScore = 0

    for (const drug of allDrugs) {
      const name = (drug.name || '').toLowerCase()
      const genericName = (drug.generic_name || '').toLowerCase()

      // 1. Exact matches (highest priority)
      if (name === cleanInput || genericName === cleanInput) {
        return drug.id
      }

      // 2. Substring matches
      let substringScore = 0
      if (name.includes(cleanInput) || cleanInput.includes(name)) {
        substringScore = 0.8
      }
      if (genericName.includes(cleanInput) || cleanInput.includes(genericName)) {
        substringScore = Math.max(substringScore, 0.8)
      }

      // 3. Dice similarity
      const nameSimilarity = this.#getSimilarity(cleanInput, name)
      const genericSimilarity = this.#getSimilarity(cleanInput, genericName)
      const similarityScore = Math.max(nameSimilarity, genericSimilarity)

      const finalScore = Math.max(substringScore, similarityScore)
      if (finalScore > maxScore) {
        maxScore = finalScore
        bestMatch = drug
      }
    }

    if (bestMatch && maxScore >= 0.4) {
      return bestMatch.id
    }

    throw new AppError(
      `Không thể nhận dạng thuốc "${drugName}". Vui lòng chọn tên thuốc từ danh sách gợi ý.`,
      404,
      'DRUG_NOT_FOUND'
    )
  }

  async #invalidateCache(userId) {
    try {
      await invalidateRecommendationCache(this.#redis, userId)
    } catch (err) {
      const logger = require('../utils/logger')
      logger.warn(
        `[Cache Invalidation Warning] Failed to clear Redis cache: ${err.message}`
      )
    }
  }
}

module.exports = AllergyService
