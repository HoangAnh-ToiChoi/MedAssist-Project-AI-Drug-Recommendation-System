const test = require('node:test')
const assert = require('node:assert/strict')

const RecommendationService = require('../src/services/RecommendationService')

const createRedisFailureMock = () => ({
  async get() {
    throw new Error('redis unavailable')
  },
  async setEx() {
    throw new Error('redis unavailable')
  },
})

test('checkSymptoms normalizes symptoms and survives redis failures', async () => {
  const patientHistoryRepo = {
    async findChronicDiseasesByUserId() {
      return [{ getCondition: () => 'Hen suyễn' }]
    },
  }

  const allergyRepo = {
    async findAllByUserId() {
      return ['Ibuprofen']
    },
  }

  const recommendationRepo = {
    async save(recommendation) {
      recommendation.id = 'rec-1'
      return recommendation
    },
    async resolveSymptomCodes(symptoms) {
      return symptoms.map((s) => {
        const trimmed = String(s || '').trim()
        if (trimmed === 'sốt') return 'sot'
        if (trimmed === 'đau đầu') return 'dau_dau'
        return trimmed
      })
    },
    async findRecommendedDrugsBySymptomCodes(symptoms) {
      return [
        {
          name: 'Paracetamol 500mg',
          generic_name: 'Paracetamol',
          confidence: 0.90,
          category: 'Giảm đau - Hạ sốt',
          description: 'Thuốc giảm đau hạ sốt thông thường, an toàn cho hầu hết người dùng.',
          dosage: '500mg - 1g mỗi 4-6 giờ, tối đa 4g/ngày',
          contraindications: 'Suy gan nặng, dị ứng Paracetamol',
        },
        {
          name: 'Ibuprofen 400mg',
          generic_name: 'Ibuprofen',
          confidence: 0.72,
          category: 'NSAIDs - Kháng viêm',
          description: 'Thuốc kháng viêm không steroid, hạ sốt và giảm đau.',
          dosage: '400mg mỗi 6-8 giờ sau ăn',
          contraindications: 'Loét dạ dày, suy thận nặng',
        },
      ]
    }
  }

  const service = new RecommendationService(
    patientHistoryRepo,
    allergyRepo,
    recommendationRepo,
    createRedisFailureMock()
  )

  const result = await service.checkSymptoms('user-1', [' sốt ', 'đau đầu', 'sốt'])

  assert.deepEqual(result.recommendations.map((item) => item.generic_name), ['Paracetamol'])
  assert.equal(result.id, 'rec-1')
  assert.equal(result.engineVersion, 'db-fallback-v1')
})

test('checkSymptoms filters out recommended drugs matching user patient history contraindications', async () => {
  const patientHistoryRepo = {
    async findChronicDiseasesByUserId() {
      return [{ getCondition: () => 'Đau dạ dày' }]
    },
  }

  const allergyRepo = {
    async findAllByUserId() {
      return []
    },
  }

  const recommendationRepo = {
    async save(recommendation) {
      recommendation.id = 'rec-2'
      return recommendation
    },
    async resolveSymptomCodes(symptoms) {
      return symptoms
    },
    async findRecommendedDrugsBySymptomCodes(symptoms) {
      return [
        {
          name: 'Paracetamol 500mg',
          generic_name: 'Paracetamol',
          confidence: 0.90,
          category: 'analgesic',
          description: 'Safe pain reliever.',
          dosage: '500mg',
          contraindications: 'Suy gan nặng.',
        },
        {
          name: 'Ibuprofen 400mg',
          generic_name: 'Ibuprofen',
          confidence: 0.72,
          category: 'NSAIDs',
          description: 'Anti-inflammatory.',
          dosage: '400mg',
          contraindications: 'Không dùng khi loét dạ dày, suy thận.',
        },
      ]
    }
  }

  const service = new RecommendationService(
    patientHistoryRepo,
    allergyRepo,
    recommendationRepo,
    createRedisFailureMock()
  )

  const result = await service.checkSymptoms('user-1', ['sot'])

  assert.deepEqual(result.recommendations.map((item) => item.generic_name), ['Paracetamol'])
  assert.equal(result.id, 'rec-2')
})
