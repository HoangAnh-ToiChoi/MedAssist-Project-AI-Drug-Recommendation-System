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

  async findRecentByUserId(userId, options = {}) {
    const days = Number.isFinite(options.days) ? Math.max(1, Math.round(options.days)) : 7
    const limit = Number.isFinite(options.limit) ? Math.max(1, Math.min(100, Math.round(options.limit))) : 20
    const values = [userId, days]
    const conditions = ['user_id = $1', "created_at >= NOW() - ($2::int * INTERVAL '1 day')"]

    if (options.eventType) {
      values.push(options.eventType)
      conditions.push(`event_type = $${values.length}`)
    }

    values.push(limit)

    const { rows } = await this.#pool.query(
      `SELECT
        id,
        recommendation_id,
        event_type,
        provider,
        status,
        fallback_used,
        latency_ms,
        request_payload,
        response_payload,
        error_message,
        created_at
      FROM ai_audit_logs
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${values.length}`,
      values
    )

    return rows
  }

  async findAllRecent(options = {}) {
    const days = Number.isFinite(options.days) ? Math.max(1, Math.round(options.days)) : 7
    const limit = Number.isFinite(options.limit) ? Math.max(1, Math.min(100, Math.round(options.limit))) : 20
    const values = [days]
    const conditions = ["l.created_at >= NOW() - ($1::int * INTERVAL '1 day')"]

    if (options.eventType) {
      values.push(options.eventType)
      conditions.push(`l.event_type = $${values.length}`)
    }
    if (options.status) {
      values.push(options.status)
      conditions.push(`l.status = $${values.length}`)
    }
    if (options.fallbackUsed !== undefined) {
      values.push(options.fallbackUsed === 'true' || options.fallbackUsed === true)
      conditions.push(`l.fallback_used = $${values.length}`)
    }

    values.push(limit)

    const { rows } = await this.#pool.query(
      `SELECT
        l.id,
        l.user_id,
        u.email AS user_email,
        l.recommendation_id,
        l.event_type,
        l.provider,
        l.status,
        l.fallback_used,
        l.latency_ms,
        l.request_payload,
        l.response_payload,
        l.error_message,
        l.created_at
      FROM ai_audit_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY l.created_at DESC
      LIMIT $${values.length}`,
      values
    )

    return rows
  }
}

module.exports = AiAuditLogRepository
