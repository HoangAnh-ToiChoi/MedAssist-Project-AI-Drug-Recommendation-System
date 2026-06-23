class AiAuditInsightsService {
  #aiAuditLogRepository

  constructor(aiAuditLogRepository) {
    this.#aiAuditLogRepository = aiAuditLogRepository
  }

  async getSummaryForUser(userId, options = {}) {
    const rows = await this.#aiAuditLogRepository.findRecentByUserId(userId, options)

    const providerBreakdown = {}
    const eventBreakdown = {}
    const statusBreakdown = {}
    const qualityBreakdown = {}
    const errorBreakdown = {}
    const latencies = []
    let fallbackCount = 0

    for (const row of rows) {
      const responsePayload = this.#parseJson(row.response_payload)
      const provider = responsePayload?.provider || row.provider || 'none'
      const qualityStatus = responsePayload?.quality?.status || null

      providerBreakdown[provider] = (providerBreakdown[provider] || 0) + 1
      eventBreakdown[row.event_type || 'unknown'] = (eventBreakdown[row.event_type || 'unknown'] || 0) + 1
      statusBreakdown[row.status || 'unknown'] = (statusBreakdown[row.status || 'unknown'] || 0) + 1
      if (qualityStatus) {
        qualityBreakdown[qualityStatus] = (qualityBreakdown[qualityStatus] || 0) + 1
      }
      if (row.error_message) {
        errorBreakdown[row.error_message] = (errorBreakdown[row.error_message] || 0) + 1
      }
      if (row.fallback_used) fallbackCount += 1
      if (Number.isFinite(row.latency_ms)) latencies.push(row.latency_ms)
    }

    return {
      windowDays: Number.isFinite(options.days) ? Math.max(1, Math.round(options.days)) : 7,
      rowCount: rows.length,
      fallbackRate: rows.length > 0 ? Number(((fallbackCount / rows.length) * 100).toFixed(1)) : 0,
      avgLatencyMs: this.#average(latencies),
      p95LatencyMs: this.#percentile(latencies, 0.95),
      maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : 0,
      providerBreakdown,
      eventBreakdown,
      statusBreakdown,
      qualityBreakdown,
      topErrors: this.#topEntries(errorBreakdown, 5),
    }
  }

  async getRecentEventsForUser(userId, options = {}) {
    const rows = await this.#aiAuditLogRepository.findRecentByUserId(userId, options)
    return rows.map((row) => {
      const responsePayload = this.#parseJson(row.response_payload)
      return {
        id: row.id,
        recommendationId: row.recommendation_id,
        eventType: row.event_type,
        provider: responsePayload?.provider || row.provider || 'none',
        status: row.status,
        fallbackUsed: Boolean(row.fallback_used),
        latencyMs: row.latency_ms || 0,
        qualityStatus: responsePayload?.quality?.status || null,
        errorMessage: row.error_message || null,
        createdAt: row.created_at,
      }
    })
  }

  #parseJson(value) {
    if (!value) return null
    if (typeof value === 'object') return value
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  #average(values) {
    if (values.length === 0) return 0
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  }

  #percentile(values, ratio) {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))
    return sorted[index]
  }

  #topEntries(map, limit) {
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([message, count]) => ({ message, count }))
  }
}

module.exports = AiAuditInsightsService
