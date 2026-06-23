const Symptom = require('../entities/Symptom')
const appConfig = require('../config/appConfig')
const logger = require('../utils/logger')

class CachedSymptomRepository {
  #innerRepo
  #redis

  constructor(innerRepository, redisClient) {
    this.#innerRepo = innerRepository
    this.#redis = redisClient
  }

  async findAll() {
    const cacheKey = 'symptoms:all'
    if (this.#redis) {
      try {
        const cached = await this.#redis.get(cacheKey)
        if (cached) {
          return JSON.parse(cached).map((item) => Symptom.fromRow(item))
        }
      } catch (err) {
        logger.warn(`Redis failed to read symptoms cache: ${err.message}`)
      }
    }

    const rows = await this.#innerRepo.findAll()

    if (this.#redis) {
      try {
        await this.#redis.setEx(cacheKey, appConfig.cache.symptomsTtlSeconds, JSON.stringify(rows))
      } catch (err) {
        logger.warn(`Redis failed to write symptoms cache: ${err.message}`)
      }
    }

    return rows
  }
}

module.exports = CachedSymptomRepository
