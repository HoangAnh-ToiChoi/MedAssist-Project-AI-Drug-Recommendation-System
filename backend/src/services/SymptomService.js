class SymptomService {
  #symptomRepo
  #redis

  constructor(symptomRepository, redisClient) {
    this.#symptomRepo = symptomRepository
    this.#redis = redisClient
  }

  async getSymptomsForSelection() {
    try {
      const cached = await this.#redis.get('symptoms:all')
      if (cached) return JSON.parse(cached)
    } catch {
      // Redis down — tiếp tục query DB
    }

    const rows = await this.#symptomRepo.findAll()

    try {
      await this.#redis.setEx('symptoms:all', 3600, JSON.stringify(rows))
    } catch {
      // Redis vẫn down — bỏ qua, không ảnh hưởng response
    }

    return rows
  }
}

module.exports = SymptomService
