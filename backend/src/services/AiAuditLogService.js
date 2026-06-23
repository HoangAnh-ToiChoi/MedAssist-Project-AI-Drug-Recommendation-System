const logger = require('../utils/logger')

class AiAuditLogService {
  #aiAuditLogRepository

  constructor(aiAuditLogRepository) {
    this.#aiAuditLogRepository = aiAuditLogRepository
  }

  async record(event) {
    if (!this.#aiAuditLogRepository || !event) {
      return
    }

    try {
      await this.#aiAuditLogRepository.save({
        userId: event.userId,
        recommendationId: event.recommendationId || null,
        eventType: event.eventType,
        provider: event.provider || null,
        status: event.status || 'unknown',
        fallbackUsed: Boolean(event.fallbackUsed),
        latencyMs: Number.isFinite(event.latencyMs) ? event.latencyMs : null,
        requestPayload: this.#toJsonSafeValue(event.requestPayload),
        responsePayload: this.#toJsonSafeValue(event.responsePayload),
        errorMessage: event.errorMessage ? String(event.errorMessage) : null,
      })
    } catch (err) {
      logger.warn(`[AI Audit Warning] Failed to persist ${event.eventType || 'unknown'} audit log: ${err.message}`)
    }
  }

  #toJsonSafeValue(value) {
    if (value === undefined) return null

    try {
      return JSON.parse(JSON.stringify(value))
    } catch {
      return {
        serializationError: 'Failed to serialize audit payload.',
      }
    }
  }
}

module.exports = AiAuditLogService
