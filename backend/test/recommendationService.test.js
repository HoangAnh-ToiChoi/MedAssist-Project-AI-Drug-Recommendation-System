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
  aiEngines,
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
        if (typeof resolveSymptomsWithinSpecialty === 'function') {
          return resolveSymptomsWithinSpecialty(specialty, symptoms)
        }

        return symptoms
      },
      async findDiseaseGraphRecommendations(specialty, symptomCodes) {
        return findDiseaseGraphRecommendations(specialty, symptomCodes)
      },
    },
    createRedisFailureMock(),
    aiEngines
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
  assert.deepEqual(result.llmExplanation, {
    enabled: false,
    status: 'disabled',
    provider: null,
    summary: 'Recommendations were finalized for specialty ho_hap using 2 matched symptom(s) and 1 safe option(s).',
    explanation: 'Likely related conditions included Hen phe quan. The backend kept the grounded result authoritative, then removed allergy conflicts and history contraindications before ranking the remaining medications by confidence.',
    safetyNote: 'This explanation is informational only and does not replace evaluation by a qualified clinician.',
  })
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
  assert.equal(result.llmExplanation.status, 'disabled')
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
  assert.equal(result.llmExplanation.status, 'disabled')
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

test('checkSymptoms attaches AI explanation when engine returns one for grounded result', async () => {
  const explanationPayloads = []
  const service = createService({
    saveId: 'rec-5',
    aiEngines: [
      {
        provider: 'ai-service',
        async getRecommendations(specialty, symptoms) {
          assert.equal(specialty, 'than_kinh')
          assert.deepEqual(symptoms, ['dau_dau'])
          return {
            engineVersion: 'ai-service-v2',
            matchedSymptoms: ['dau_dau'],
            topDiseases: [{ id: 'disease-5', code: 'migraine', displayName: 'Migraine', score: 0.87 }],
            recommendations: [
              {
                name: 'Paracetamol 500mg',
                generic_name: 'Paracetamol',
                confidence: 0.9,
                contraindications: '',
              },
            ],
            dangerAlert: null,
          }
        },
        async explainGroundedRecommendation(payload) {
          explanationPayloads.push(payload)
          return {
            enabled: true,
            status: 'success',
            provider: 'ai-service',
            summary: 'Grounded recommendation summary.',
            explanation: 'Grounded recommendation explanation.',
            safetyNote: 'Escalate care if symptoms worsen.',
          }
        },
      },
    ],
  })

  const result = await service.checkSymptoms('user-1', 'than_kinh', ['dau_dau'])

  assert.equal(result.id, 'rec-5')
  assert.equal(explanationPayloads.length, 1)
  assert.deepEqual(explanationPayloads[0].recommendations, result.recommendations)
  assert.deepEqual(result.llmExplanation, {
    enabled: true,
    status: 'success',
    provider: 'ai-service',
    summary: 'Grounded recommendation summary.',
    explanation: 'Grounded recommendation explanation.',
    safetyNote: 'Escalate care if symptoms worsen.',
  })
})

test('checkSymptoms keeps recommendation success when AI explanation fails', async () => {
  const service = createService({
    history: ['Tang huyet ap'],
    saveId: 'rec-6',
    aiEngines: [
      {
        provider: 'ai-service',
        async getRecommendations() {
          return {
            engineVersion: 'ai-service-v2',
            matchedSymptoms: ['chong_mat'],
            topDiseases: [{ id: 'disease-6', code: 'vertigo', displayName: 'Chong mat', score: 0.81 }],
            recommendations: [
              {
                name: 'Betahistine 16mg',
                generic_name: 'Betahistine',
                confidence: 0.86,
                contraindications: '',
              },
            ],
            dangerAlert: 'Canh bao y te.',
          }
        },
        async explainGroundedRecommendation() {
          throw new Error('explanation timeout')
        },
      },
    ],
  })

  const result = await service.checkSymptoms('user-1', 'than_kinh', ['chong_mat'])

  assert.equal(result.id, 'rec-6')
  assert.deepEqual(result.recommendations.map((item) => item.generic_name), ['Betahistine'])
  assert.deepEqual(result.llmExplanation, {
    enabled: true,
    status: 'fallback',
    provider: 'ai-service',
    summary: 'Recommendations were finalized for specialty than_kinh using 1 matched symptom(s) and 1 safe option(s).',
    explanation: 'Likely related conditions included Chong mat. The backend kept the grounded result authoritative, then removed allergy conflicts and history contraindications before ranking the remaining medications by confidence.',
    safetyNote: 'Canh bao y te.',
    error: 'explanation timeout',
  })
})
