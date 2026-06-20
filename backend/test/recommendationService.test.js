const test = require('node:test')
const assert = require('node:assert/strict')

const Allergy = require('../src/entities/Allergy')
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
      return [{ getCondition: () => 'Hen suyá»…n' }]
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
        if (trimmed === 'sá»‘t') return 'sot'
        if (trimmed === 'Ä‘au Ä‘áº§u') return 'dau_dau'
        return trimmed
      })
    },
    async findRecommendedDrugsBySymptomCodes() {
      return [
        {
          name: 'Paracetamol 500mg',
          generic_name: 'Paracetamol',
          confidence: 0.90,
          category: 'Giáº£m Ä‘au - Háº¡ sá»‘t',
          description: 'Thuá»‘c giáº£m Ä‘au háº¡ sá»‘t thÃ´ng thÆ°á»ng, an toÃ n cho háº§u háº¿t ngÆ°á»i dÃ¹ng.',
          dosage: '500mg - 1g má»—i 4-6 giá», tá»‘i Ä‘a 4g/ngÃ y',
          contraindications: 'Suy gan náº·ng, dá»‹ á»©ng Paracetamol',
        },
        {
          name: 'Ibuprofen 400mg',
          generic_name: 'Ibuprofen',
          confidence: 0.72,
          category: 'NSAIDs - KhÃ¡ng viÃªm',
          description: 'Thuá»‘c khÃ¡ng viÃªm khÃ´ng steroid, háº¡ sá»‘t vÃ  giáº£m Ä‘au.',
          dosage: '400mg má»—i 6-8 giá» sau Äƒn',
          contraindications: 'LoÃ©t dáº¡ dÃ y, suy tháº­n náº·ng',
        },
      ]
    },
  }

  const service = new RecommendationService(
    patientHistoryRepo,
    allergyRepo,
    recommendationRepo,
    createRedisFailureMock()
  )

  const result = await service.checkSymptoms('user-1', [' sá»‘t ', 'Ä‘au Ä‘áº§u', 'sá»‘t'])

  assert.deepEqual(result.recommendations.map((item) => item.generic_name), ['Paracetamol'])
  assert.equal(result.id, 'rec-1')
  assert.equal(result.engineVersion, 'db-fallback-v1')
})

test('checkSymptoms filters out recommended drugs matching user patient history contraindications', async () => {
  const patientHistoryRepo = {
    async findChronicDiseasesByUserId() {
      return [{ getCondition: () => 'Äau dáº¡ dÃ y' }]
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
    async findRecommendedDrugsBySymptomCodes() {
      return [
        {
          name: 'Paracetamol 500mg',
          generic_name: 'Paracetamol',
          confidence: 0.90,
          category: 'analgesic',
          description: 'Safe pain reliever.',
          dosage: '500mg',
          contraindications: 'Suy gan náº·ng.',
        },
        {
          name: 'Ibuprofen 400mg',
          generic_name: 'Ibuprofen',
          confidence: 0.72,
          category: 'NSAIDs',
          description: 'Anti-inflammatory.',
          dosage: '400mg',
          contraindications: 'KhÃ´ng dÃ¹ng khi loÃ©t dáº¡ dÃ y, suy tháº­n.',
        },
      ]
    },
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

test('checkSymptoms filters drugs that share the same generic ingredient as a recorded allergy', async () => {
  const patientHistoryRepo = {
    async findChronicDiseasesByUserId() {
      return []
    },
  }

  const allergyRepo = {
    async findAllByUserId() {
      return [
        new Allergy({
          name: 'Panadol',
          genericName: 'Paracetamol',
        }),
      ]
    },
  }

  const recommendationRepo = {
    async save(recommendation) {
      recommendation.id = 'rec-3'
      return recommendation
    },
    async resolveSymptomCodes(symptoms) {
      return symptoms
    },
    async findRecommendedDrugsBySymptomCodes() {
      return [
        {
          name: 'Paracetamol Siro',
          generic_name: 'Paracetamol',
          confidence: 0.91,
          category: 'analgesic',
          description: 'Pediatric syrup.',
          dosage: '5ml',
          contraindications: '',
        },
        {
          name: 'Ibuprofen 400mg',
          generic_name: 'Ibuprofen',
          confidence: 0.73,
          category: 'NSAIDs',
          description: 'Anti-inflammatory.',
          dosage: '400mg',
          contraindications: '',
        },
      ]
    },
  }

  const service = new RecommendationService(
    patientHistoryRepo,
    allergyRepo,
    recommendationRepo,
    createRedisFailureMock()
  )

  const result = await service.checkSymptoms('user-1', ['sot'])

  assert.deepEqual(result.recommendations.map((item) => item.generic_name), ['Ibuprofen'])
  assert.equal(result.id, 'rec-3')
})

test('checkSymptoms throws a service-unavailable error when database fallback also fails', async () => {
  process.env.AI_SERVICE_URL = ''

  const patientHistoryRepo = {
    async findChronicDiseasesByUserId() {
      return []
    },
  }

  const allergyRepo = {
    async findAllByUserId() {
      return []
    },
  }

  const recommendationRepo = {
    async save() {
      throw new Error('should not save when recommendation generation fails')
    },
    async resolveSymptomCodes(symptoms) {
      return symptoms
    },
    async findRecommendedDrugsBySymptomCodes() {
      throw new Error('database unavailable')
    },
  }

  const service = new RecommendationService(
    patientHistoryRepo,
    allergyRepo,
    recommendationRepo,
    createRedisFailureMock()
  )

  await assert.rejects(
    service.checkSymptoms('user-1', ['sot']),
    (error) => error.code === 'RECOMMENDATION_UNAVAILABLE' && error.statusCode === 503
  )
})
