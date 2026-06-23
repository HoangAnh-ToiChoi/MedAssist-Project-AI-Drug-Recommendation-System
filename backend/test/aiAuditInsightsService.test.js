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
