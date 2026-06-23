const test = require('node:test')
const assert = require('node:assert/strict')

const AiAuditInsightsService = require('../src/services/AiAuditInsightsService')

test('getSummaryForUser aggregates fallback, provider, quality and latency metrics', async () => {
  const repository = {
    async findRecentByUserId() {
      return [
        {
          event_type: 'recommendation_explanation',
          provider: 'ai-service',
          status: 'success',
          fallback_used: false,
          latency_ms: 900,
          response_payload: { provider: 'groq', quality: { status: 'pass' } },
          error_message: null,
        },
        {
          event_type: 'grounded_chatbot',
          provider: 'ai-service',
          status: 'fallback',
          fallback_used: true,
          latency_ms: 1500,
          response_payload: { provider: 'none' },
          error_message: 'timeout',
        },
      ]
    },
  }

  const service = new AiAuditInsightsService(repository)
  const result = await service.getSummaryForUser('user-1', { days: 3 })

  assert.equal(result.windowDays, 3)
  assert.equal(result.rowCount, 2)
  assert.equal(result.fallbackRate, 50)
  assert.equal(result.avgLatencyMs, 1200)
  assert.equal(result.p95LatencyMs, 1500)
  assert.deepEqual(result.providerBreakdown, { groq: 1, none: 1 })
  assert.deepEqual(result.eventBreakdown, {
    recommendation_explanation: 1,
    grounded_chatbot: 1,
  })
  assert.deepEqual(result.statusBreakdown, { success: 1, fallback: 1 })
  assert.deepEqual(result.qualityBreakdown, { pass: 1 })
  assert.deepEqual(result.topErrors, [{ message: 'timeout', count: 1 }])
})

test('getRecentEventsForUser normalizes recent audit rows for frontend consumption', async () => {
  const repository = {
    async findRecentByUserId() {
      return [
        {
          id: 10,
          recommendation_id: 'rec-1',
          event_type: 'grounded_chatbot',
          provider: 'ai-service',
          status: 'success',
          fallback_used: false,
          latency_ms: 820,
          response_payload: { provider: 'groq', quality: { status: 'pass' } },
          error_message: null,
          created_at: '2026-06-23T00:00:00.000Z',
        },
      ]
    },
  }

  const service = new AiAuditInsightsService(repository)
  const result = await service.getRecentEventsForUser('user-1', { limit: 5 })

  assert.equal(result.length, 1)
  assert.deepEqual(result[0], {
    id: 10,
    recommendationId: 'rec-1',
    eventType: 'grounded_chatbot',
    provider: 'groq',
    status: 'success',
    fallbackUsed: false,
    latencyMs: 820,
    qualityStatus: 'pass',
    errorMessage: null,
    createdAt: '2026-06-23T00:00:00.000Z',
  })
})

test('getGlobalSummary aggregates system-wide metrics across all users', async () => {
  const repository = {
    async findAllRecent(options) {
      assert.equal(options.days, 10)
      return [
        {
          event_type: 'recommendation_explanation',
          provider: 'groq',
          status: 'success',
          fallback_used: false,
          latency_ms: 500,
          response_payload: { provider: 'groq', quality: { status: 'pass' } },
          error_message: null,
        }
      ]
    }
  }

  const service = new AiAuditInsightsService(repository)
  const result = await service.getGlobalSummary({ days: 10 })

  assert.equal(result.windowDays, 10)
  assert.equal(result.rowCount, 1)
  assert.equal(result.fallbackRate, 0)
  assert.deepEqual(result.providerBreakdown, { groq: 1 })
})

test('getGlobalRecentEvents normalizes system-wide audit rows including user emails', async () => {
  const repository = {
    async findAllRecent(options) {
      assert.equal(options.limit, 5)
      return [
        {
          id: 'evt-1',
          user_id: 'user-abc',
          user_email: 'patient@example.com',
          recommendation_id: 'rec-2',
          event_type: 'recommendation_explanation',
          provider: 'groq',
          status: 'success',
          fallback_used: false,
          latency_ms: 450,
          request_payload: { specialty: 'ho_hap' },
          response_payload: { provider: 'groq', quality: { status: 'pass' } },
          error_message: null,
          created_at: '2026-06-23T10:00:00.000Z',
        }
      ]
    }
  }

  const service = new AiAuditInsightsService(repository)
  const result = await service.getGlobalRecentEvents({ limit: 5 })

  assert.equal(result.length, 1)
  assert.deepEqual(result[0], {
    id: 'evt-1',
    userEmail: 'patient@example.com',
    recommendationId: 'rec-2',
    eventType: 'recommendation_explanation',
    provider: 'groq',
    status: 'success',
    fallbackUsed: false,
    latencyMs: 450,
    qualityStatus: 'pass',
    errorMessage: null,
    createdAt: '2026-06-23T10:00:00.000Z',
    requestPayload: { specialty: 'ho_hap' },
    responsePayload: { provider: 'groq', quality: { status: 'pass' } },
  })
})

