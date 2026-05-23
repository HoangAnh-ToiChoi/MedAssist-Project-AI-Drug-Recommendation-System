// backend/src/services/RecommendationService.js
class RecommendationService {
  #patientHistoryRepo
  #allergyRepo
  #recommendationRepo
  #redis

  constructor(patientHistoryRepo, allergyRepo, recommendationRepo, redis) {
    this.#patientHistoryRepo = patientHistoryRepo
    this.#allergyRepo        = allergyRepo
    this.#recommendationRepo = recommendationRepo
    this.#redis              = redis
  }

  async checkSymptoms(userId, symptoms) {
    const cacheKey = `recommend:${userId}:${[...symptoms].sort().join('-')}`
    const cached = await this.#redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    // [Tell Don't Ask] gọi đúng method có intent rõ ràng — không nhận raw rows rồi tự filter
    const [history, allergies] = await Promise.all([
      this.#patientHistoryRepo.findChronicDiseasesByUserId(userId),
      this.#allergyRepo.findAllByUserId(userId),
    ])

    const aiResult = await this.#callAiService(symptoms, history, allergies)
    const filtered = this.#filterAllergies(aiResult.recommendations, allergies)

    const saved = await this.#recommendationRepo.create({
      userId,
      inputSymptoms: { symptoms, history, allergies },
      outputDrugs:   filtered,
      dangerAlert:   null,
      engineVersion: aiResult.engineVersion,
    })

    const result = {
      id:              saved.id,
      recommendations: filtered,
      engineVersion:   aiResult.engineVersion,
    }

    await this.#redis.setEx(cacheKey, 1800, JSON.stringify(result))
    return result
  }

  #filterAllergies(recommendations, allergies) {
    if (!allergies.length) return recommendations
    const lowerAllergies = allergies.map(a => a.toLowerCase())
    return recommendations.filter(drug =>
      !lowerAllergies.some(a =>
        drug.name.toLowerCase().includes(a) ||
        drug.generic_name.toLowerCase().includes(a)
      )
    )
  }

  // TODO: swap body này khi AI service sẵn sàng
  // Contract: { symptoms: string[], history: string[], allergies: string[] }
  // per docs/api-contracts/be-ai-contract.md
  async #callAiService(symptoms, history, allergies) {
    return {
      engineVersion: 'mock-v0',
      recommendations: [
        {
          name:              'Paracetamol 500mg',
          generic_name:      'Paracetamol',
          confidence:        0.90,
          category:          'Giảm đau - Hạ sốt',
          reason:            'Phù hợp với triệu chứng sốt và đau đầu. Không có tương tác với thuốc đang dùng.',
          description:       'Thuốc giảm đau hạ sốt thông thường, an toàn cho hầu hết người dùng.',
          dosage:            '500mg - 1g mỗi 4-6 giờ, tối đa 4g/ngày',
          contraindications: 'Suy gan nặng, dị ứng Paracetamol',
        },
        {
          name:              'Ibuprofen 400mg',
          generic_name:      'Ibuprofen',
          confidence:        0.72,
          category:          'NSAIDs - Kháng viêm',
          reason:            'Có tác dụng hạ sốt và giảm đau đầu hiệu quả.',
          description:       'Thuốc kháng viêm không steroid, hạ sốt và giảm đau.',
          dosage:            '400mg mỗi 6-8 giờ sau ăn',
          contraindications: 'Loét dạ dày, suy thận nặng',
        },
      ],
    }
  }
}

module.exports = RecommendationService
