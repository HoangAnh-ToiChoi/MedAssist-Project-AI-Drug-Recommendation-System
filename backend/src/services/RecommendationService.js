// backend/src/services/RecommendationService.js
class RecommendationService {
  #patientHistoryRepo
  #allergyRepo
  #recommendationRepo

  constructor(patientHistoryRepo, allergyRepo, recommendationRepo) {
    this.#patientHistoryRepo = patientHistoryRepo
    this.#allergyRepo = allergyRepo
    this.#recommendationRepo = recommendationRepo
  }

  async checkSymptoms(userId, symptoms) {
    const historyRows = await this.#patientHistoryRepo.findAllByUserId(userId)
    const allergyRows = await this.#allergyRepo.findAllByUserId(userId)

    const history     = historyRows.filter(r => r.entry_type === 'chronic_disease').map(r => r.title)
    const medications = historyRows.filter(r => r.entry_type === 'current_medication').map(r => r.title)
    const allergies   = allergyRows.map(r => r.drug_name)

    const aiResult = await this.#callAiService(symptoms, history, medications, allergies)

    const saved = await this.#recommendationRepo.create({
      userId,
      inputSymptoms:  { symptoms, history, medications, allergies },
      outputDrugs:    aiResult,
      dangerAlert:    null,
      engineVersion:  aiResult.engineVersion,
    })

    return {
      id:              saved.id,
      recommendations: aiResult.recommendations,
      engineVersion:   aiResult.engineVersion,
    }
  }

  // TODO: swap body này khi AI service sẵn sàng
  async #callAiService(symptoms, history, medications, allergies) {
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
