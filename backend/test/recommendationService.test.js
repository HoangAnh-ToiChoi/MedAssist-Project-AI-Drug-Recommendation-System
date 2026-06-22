const test = require('node:test')
const assert = require('node:assert/strict')

const Allergy = require('../src/entities/Allergy')
const loggerModulePath = require.resolve('../src/utils/logger')

require.cache[loggerModulePath] = {
  id: loggerModulePath,
  filename: loggerModulePath,
  loaded: true,
  exports: {
    info() {},
    warn() {},
    error() {},
  },
}

const RecommendationService = require('../src/services/RecommendationService')

const createRedisFailureMock = () => ({
  async get() {
    throw new Error('redis unavailable')
  },
  async setEx() {
    throw new Error('redis unavailable')
  },
})

const createService = ({
  history = [],
  allergies = [],
  resolveSymptomsWithinSpecialty,
  findDiseaseGraphRecommendations,
  saveId,
}) =>
  new RecommendationService(
    {
      async findChronicDiseasesByUserId() {
        return history.map((condition) => ({ getCondition: () => condition }))
      },
    },
    {
      async findAllByUserId() {
        return allergies
      },
    },
    {
      async save(recommendation) {
        recommendation.id = saveId
        return recommendation
      },
      async resolveSymptomCodesWithinSpecialty(specialty, symptoms) {
        return resolveSymptomsWithinSpecialty(specialty, symptoms)
      },
      async findDiseaseGraphRecommendations(specialty, symptomCodes) {
        return findDiseaseGraphRecommendations(specialty, symptomCodes)
      },
    },
    createRedisFailureMock()
  )

test('checkSymptoms scopes normalization to specialty and survives redis failures', async () => {
  const service = createService({
    history: ['Hen suyuen'],
    allergies: ['Ibuprofen'],
    saveId: 'rec-1',
    resolveSymptomsWithinSpecialty: async (specialty, symptoms) => {
      assert.equal(specialty, 'ho_hap')
      return symptoms.map((item) => {
        const trimmed = String(item || '').trim()
        if (trimmed === 'sot') return 'sot'
        if (trimmed === 'dau dau') return 'dau_dau'
        return trimmed
      })
    },
    findDiseaseGraphRecommendations: async (specialty, symptomCodes) => {
      assert.equal(specialty, 'ho_hap')
      assert.deepEqual(symptomCodes, ['dau_dau', 'sot'])
      return {
        matchedSymptoms: symptomCodes,
        topDiseases: [{ id: 'disease-1', code: 'asthma', displayName: 'Hen phe quan', score: 0.92 }],
        recommendations: [
          {
            name: 'Paracetamol 500mg',
            generic_name: 'Paracetamol',
            confidence: 0.9,
            category: 'analgesic',
            description: 'Safe pain reliever.',
            dosage: '500mg',
            contraindications: 'Suy gan nang',
          },
          {
            name: 'Ibuprofen 400mg',
            generic_name: 'Ibuprofen',
            confidence: 0.72,
            category: 'NSAIDs',
            description: 'Anti-inflammatory.',
            dosage: '400mg',
            contraindications: 'Loet da day',
          },
        ],
      }
    },
  })

  const result = await service.checkSymptoms('user-1', 'ho_hap', [' sot ', 'dau dau', 'sot'])

  assert.equal(result.id, 'rec-1')
  assert.equal(result.specialty, 'ho_hap')
  assert.deepEqual(result.matchedSymptoms, ['dau_dau', 'sot'])
  assert.equal(result.topDiseases.length, 1)
  assert.deepEqual(result.recommendations.map((item) => item.generic_name), ['Paracetamol'])
  assert.equal(result.engineVersion, 'disease-graph-v1')
})

test('checkSymptoms filters out recommendations contraindicated for patient history', async () => {
  const service = createService({
    history: ['Dau da day'],
    saveId: 'rec-2',
    resolveSymptomsWithinSpecialty: async (specialty, symptoms) => {
      assert.equal(specialty, 'tieu_hoa')
      return symptoms
    },
    findDiseaseGraphRecommendations: async () => ({
      matchedSymptoms: ['sot'],
      topDiseases: [{ id: 'disease-2', code: 'gastritis', displayName: 'Viem da day', score: 0.8 }],
      recommendations: [
        {
          name: 'Paracetamol 500mg',
          generic_name: 'Paracetamol',
          confidence: 0.9,
          category: 'analgesic',
          description: 'Safe pain reliever.',
          dosage: '500mg',
          contraindications: 'Suy gan nang',
        },
        {
          name: 'Ibuprofen 400mg',
          generic_name: 'Ibuprofen',
          confidence: 0.72,
          category: 'NSAIDs',
          description: 'Anti-inflammatory.',
          dosage: '400mg',
          contraindications: 'Khong dung khi loet da day, suy than.',
        },
      ],
    }),
  })

  const result = await service.checkSymptoms('user-1', 'tieu_hoa', ['sot'])

  assert.equal(result.id, 'rec-2')
  assert.deepEqual(result.recommendations.map((item) => item.generic_name), ['Paracetamol'])
})

test('checkSymptoms filters drugs that match a recorded allergy ingredient', async () => {
  const service = createService({
    allergies: [
      new Allergy({
        name: 'Panadol',
        genericName: 'Paracetamol',
      }),
    ],
    saveId: 'rec-3',
    resolveSymptomsWithinSpecialty: async (specialty, symptoms) => {
      assert.equal(specialty, 'nhi_khoa')
      return symptoms
    },
    findDiseaseGraphRecommendations: async () => ({
      matchedSymptoms: ['sot'],
      topDiseases: [{ id: 'disease-3', code: 'flu', displayName: 'Cum', score: 0.88 }],
      recommendations: [
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
      ],
    }),
  })

  const result = await service.checkSymptoms('user-1', 'nhi_khoa', ['sot'])

  assert.equal(result.id, 'rec-3')
  assert.deepEqual(result.recommendations.map((item) => item.generic_name), ['Ibuprofen'])
})

test('checkSymptoms rejects requests without specialty', async () => {
  const service = createService({
    saveId: 'rec-missing-specialty',
    resolveSymptomsWithinSpecialty: async () => [],
    findDiseaseGraphRecommendations: async () => ({ matchedSymptoms: [], topDiseases: [], recommendations: [] }),
  })

  await assert.rejects(
    service.checkSymptoms('user-1', '', ['sot']),
    (error) => error.code === 'SPECIALTY_REQUIRED' && error.statusCode === 400
  )
})

test('checkSymptoms throws service unavailable when disease-graph fallback fails', async () => {
  process.env.AI_SERVICE_URL = ''

  const service = createService({
    saveId: 'rec-4',
    resolveSymptomsWithinSpecialty: async (specialty, symptoms) => {
      assert.equal(specialty, 'ho_hap')
      return symptoms
    },
    findDiseaseGraphRecommendations: async () => {
      throw new Error('database unavailable')
    },
  })

  await assert.rejects(
    service.checkSymptoms('user-1', 'ho_hap', ['sot']),
    (error) => error.code === 'RECOMMENDATION_UNAVAILABLE' && error.statusCode === 503
  )
})
