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
    try {
      const result = await this.#allergyRepository.createAllergy({
        userId,
        ...allergyData,
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
