const ApiResponse = require('../utils/ApiResponse')

class AiAuditInsightsController {
  #aiAuditInsightsService

  constructor(aiAuditInsightsService) {
    this.#aiAuditInsightsService = aiAuditInsightsService
  }

  async getSummary(req, res, next) {
    try {
      const days = Number(req.query.days || 7)
      const eventType = req.query.eventType ? String(req.query.eventType) : null
      const global = req.query.global === 'true'

      let summary
      if (global) {
        summary = await this.#aiAuditInsightsService.getGlobalSummary({
          days,
          eventType,
        })
      } else {
        summary = await this.#aiAuditInsightsService.getSummaryForUser(req.user.id, {
          days,
          eventType,
        })
      }
      res.json(ApiResponse.success(summary, 'AI audit summary loaded'))
    } catch (err) {
      next(err)
    }
  }

  async getRecentEvents(req, res, next) {
    try {
      const days = Number(req.query.days || 7)
      const limit = Number(req.query.limit || 20)
      const eventType = req.query.eventType ? String(req.query.eventType) : null
      const status = req.query.status ? String(req.query.status) : null
      const fallbackUsed = req.query.fallbackUsed !== undefined ? req.query.fallbackUsed : undefined
      const global = req.query.global === 'true'

      let events
      if (global) {
        events = await this.#aiAuditInsightsService.getGlobalRecentEvents({
          days,
          limit,
          eventType,
          status,
          fallbackUsed,
        })
      } else {
        events = await this.#aiAuditInsightsService.getRecentEventsForUser(req.user.id, {
          days,
          limit,
          eventType,
        })
      }
      res.json(ApiResponse.success(events, 'AI audit events loaded'))
    } catch (err) {
      next(err)
    }
  }
}

module.exports = AiAuditInsightsController
