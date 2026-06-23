class AiAuditLogRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async save(event) {
    await this.#pool.query(
      `INSERT INTO ai_audit_logs (
        user_id,
        recommendation_id,
        event_type,
        provider,
        status,
        fallback_used,
        latency_ms,
        request_payload,
        response_payload,
        error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        event.userId,
        event.recommendationId || null,
        event.eventType,
        event.provider || null,
        event.status,
        Boolean(event.fallbackUsed),
        Number.isFinite(event.latencyMs) ? Math.max(0, Math.round(event.latencyMs)) : null,
        JSON.stringify(event.requestPayload || {}),
        JSON.stringify(event.responsePayload || {}),
        event.errorMessage || null,
      ]
    )
  }
}

module.exports = AiAuditLogRepository
