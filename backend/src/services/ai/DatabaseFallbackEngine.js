const AIProvider = require('./AIProvider')
const { DANGER_SYMPTOM_MESSAGES } = require('../../config/recommendationRules')

class DatabaseFallbackEngine extends AIProvider {
  #recommendationRepo

  constructor(recommendationRepo) {
    super()
    this.#recommendationRepo = recommendationRepo
  }

  async getRecommendations(symptoms, history, allergies) {
    const recommendations = await this.#recommendationRepo.findRecommendedDrugsBySymptomCodes(symptoms)
    return {
      engineVersion: 'db-fallback-v1',
      dangerAlert: this.#detectDanger(symptoms),
      recommendations,
    }
  }

  #detectDanger(symptomCodes) {
    for (const code of symptomCodes) {
      if (DANGER_SYMPTOM_MESSAGES[code]) {
        return `Cảnh báo y tế: ${DANGER_SYMPTOM_MESSAGES[code]} Thông tin gợi ý dưới đây chỉ mang tính tham khảo.`
      }
    }
    return null
  }
}

module.exports = DatabaseFallbackEngine
