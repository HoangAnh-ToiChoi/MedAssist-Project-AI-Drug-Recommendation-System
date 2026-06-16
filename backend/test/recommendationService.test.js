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
      return [{
        name: 'Ibuprofen',
        genericName: 'Ibuprofen',
        isAllergicTo: (drug) => drug.generic_name === 'Ibuprofen',
      }]
    },
  }

  const recommendationRepo = {
    async save(recommendation) {
      recommendation.id = 'rec-1'
      return recommendation
    },
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
  assert.equal(result.engineVersion, 'mock-v0')
})
