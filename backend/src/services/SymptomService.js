class SymptomService {
  #symptomRepo

  constructor(symptomRepository, redisClient) {
    if (arguments.length === 1 && typeof arguments[0] === 'object' && arguments[0] !== null) {
      const deps = arguments[0]
      this.#symptomRepo = deps.symptomRepository || deps.symptomRepo
    } else {
      if (redisClient) {
        const CachedSymptomRepository = require('../repositories/CachedSymptomRepository')
        this.#symptomRepo = new CachedSymptomRepository(symptomRepository, redisClient)
      } else {
        this.#symptomRepo = symptomRepository
      }
    }
  }

  async getSymptomsForSelection() {
    return this.#symptomRepo.findAll()
  }
}

module.exports = SymptomService
