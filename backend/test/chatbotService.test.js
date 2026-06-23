const test = require('node:test')
const assert = require('node:assert/strict')

const ChatbotService = require('../src/services/ChatbotService')

const createService = ({
  recommendation,
  history = [],
  allergies = [],
  aiEngines = [],
  aiAuditLogService,
}) =>
  new ChatbotService(
    {
      async findByIdForUser(id, userId) {
        assert.equal(id, recommendation.id)
        assert.equal(userId, 'user-1')
        return recommendation
      },
    },
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
    aiEngines,
    aiAuditLogService
  )

test('chatOnRecommendation returns grounded AI answer when engine succeeds', async () => {
  const recommendation = {
    id: 'rec-1',
    inputSymptoms: { specialty: 'ho_hap', symptoms: ['ho', 'sot'] },
    outputDrugs: [
      { name: 'Paracetamol 500mg', generic_name: 'Paracetamol', confidence: 0.9 },
    ],
    dangerAlert: null,
  }

  const service = createService({
    recommendation,
    history: ['Hen phe quan'],
    allergies: [{ genericName: 'Ibuprofen' }],
    aiEngines: [
      {
        async chatGroundedRecommendation(payload) {
          assert.equal(payload.specialty, 'ho_hap')
          assert.deepEqual(payload.history, ['Hen phe quan'])
          assert.deepEqual(payload.allergies, ['Ibuprofen'])
          return {
            success: true,
            provider: 'ai-service',
            answer: 'Thuoc nay duoc giu lai sau bo loc an toan.',
            safetyNote: 'Thong tin chi de tham khao.',
            quality: {
              status: 'pass',
              score: 0.88,
            },
          }
        },
      },
    ],
  })

  const result = await service.chatOnRecommendation('user-1', {
    recommendationId: 'rec-1',
    question: 'Tai sao thuoc nay duoc goi y?',
    specialty: 'ho_hap',
    matchedSymptoms: ['ho', 'sot'],
    recommendations: [
      { name: 'Paracetamol 500mg', generic_name: 'Paracetamol', confidence: 0.9, reason: 'Phu hop' },
    ],
  })

  assert.equal(result.success, true)
  assert.equal(result.provider, 'ai-service')
  assert.deepEqual(result.quality, {
    status: 'pass',
    score: 0.88,
  })
})

test('chatOnRecommendation falls back deterministically when AI chat fails', async () => {
  const recommendation = {
    id: 'rec-2',
    inputSymptoms: { specialty: 'than_kinh', symptoms: ['dau_dau'] },
    outputDrugs: [
      { name: 'Paracetamol 500mg', generic_name: 'Paracetamol', confidence: 0.9 },
    ],
    dangerAlert: 'Canh bao y te.',
  }

  const service = createService({
    recommendation,
    aiEngines: [
      {
        async chatGroundedRecommendation() {
          throw new Error('timeout')
        },
      },
    ],
  })

  const result = await service.chatOnRecommendation('user-1', {
    recommendationId: 'rec-2',
    question: 'Co can di kham khong?',
    specialty: 'than_kinh',
    matchedSymptoms: ['dau_dau'],
    topDiseases: [{ code: 'migraine', displayName: 'Migraine', score: 0.81 }],
    recommendations: [
      { name: 'Paracetamol 500mg', generic_name: 'Paracetamol', confidence: 0.9, reason: 'Phu hop' },
    ],
    dangerAlert: 'Canh bao y te.',
  })

  assert.equal(result.success, false)
  assert.equal(result.provider, 'none')
  assert.equal(result.error, 'timeout')
  assert.match(result.answer, /grounding/i)
})

test('chatOnRecommendation rejects tampered grounded recommendations', async () => {
  const recommendation = {
    id: 'rec-3',
    inputSymptoms: { specialty: 'ho_hap', symptoms: ['ho'] },
    outputDrugs: [
      { name: 'Paracetamol 500mg', generic_name: 'Paracetamol', confidence: 0.9 },
    ],
    dangerAlert: null,
  }

  const service = createService({
    recommendation,
    aiEngines: [],
  })

  await assert.rejects(
    service.chatOnRecommendation('user-1', {
      recommendationId: 'rec-3',
      question: 'Thuoc nao khac?',
      recommendations: [
        { name: 'Ibuprofen 400mg', generic_name: 'Ibuprofen', confidence: 0.7, reason: 'Khong hop le' },
      ],
    }),
    (error) => error.code === 'GROUNDED_CONTEXT_MISMATCH' && error.statusCode === 400
  )
})

test('chatOnRecommendation emits durable audit metadata for grounded chat fallback', async () => {
  const auditEvents = []
  const recommendation = {
    id: 'rec-4',
    inputSymptoms: { specialty: 'da_lieu', symptoms: ['ngua'] },
    outputDrugs: [
      { name: 'Cetirizine 10mg', generic_name: 'Cetirizine', confidence: 0.82 },
    ],
    dangerAlert: null,
  }

  const service = createService({
    recommendation,
    aiAuditLogService: {
      async record(event) {
        auditEvents.push(event)
      },
    },
    aiEngines: [
      {
        provider: 'ai-service',
        async chatGroundedRecommendation() {
          throw new Error('timeout')
        },
      },
    ],
  })

  const result = await service.chatOnRecommendation('user-1', {
    recommendationId: 'rec-4',
    question: 'Thuoc nay dung de lam gi?',
    matchedSymptoms: ['ngua'],
    recommendations: [
      { name: 'Cetirizine 10mg', generic_name: 'Cetirizine', confidence: 0.82, reason: 'Phu hop' },
    ],
  })

  assert.equal(result.success, false)
  assert.equal(auditEvents.length, 1)
  assert.equal(auditEvents[0].eventType, 'grounded_chatbot')
  assert.equal(auditEvents[0].userId, 'user-1')
  assert.equal(auditEvents[0].recommendationId, 'rec-4')
  assert.equal(auditEvents[0].provider, 'ai-service')
  assert.equal(auditEvents[0].status, 'fallback')
  assert.equal(auditEvents[0].fallbackUsed, true)
  assert.equal(auditEvents[0].errorMessage, 'timeout')
  assert.equal(auditEvents[0].requestPayload.question, 'Thuoc nay dung de lam gi?')
  assert.deepEqual(auditEvents[0].responsePayload, result)
  assert.equal(typeof auditEvents[0].latencyMs, 'number')
})

test('chatOnRecommendation ignores audit persistence failures', async () => {
  const recommendation = {
    id: 'rec-5',
    inputSymptoms: { specialty: 'noi_khoa', symptoms: ['sot'] },
    outputDrugs: [
      { name: 'Paracetamol 500mg', generic_name: 'Paracetamol', confidence: 0.9 },
    ],
    dangerAlert: null,
  }

  const service = createService({
    recommendation,
    aiAuditLogService: {
      async record() {
        throw new Error('audit unavailable')
      },
    },
    aiEngines: [
      {
        async chatGroundedRecommendation() {
          return {
            success: true,
            provider: 'ai-service',
            answer: 'Tra loi grounded.',
            safetyNote: 'Thong tin tham khao.',
          }
        },
      },
    ],
  })

  const result = await service.chatOnRecommendation('user-1', {
    recommendationId: 'rec-5',
    question: 'Tai sao thuoc nay phu hop?',
    recommendations: [
      { name: 'Paracetamol 500mg', generic_name: 'Paracetamol', confidence: 0.9, reason: 'Phu hop' },
    ],
  })

  assert.equal(result.success, true)
  assert.equal(result.provider, 'ai-service')
})
