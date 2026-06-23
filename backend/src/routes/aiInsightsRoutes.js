const { Router } = require('express')
const authenticate = require('../middlewares/auth')
const container = require('../config/container')
const AppError = require('../utils/AppError')

const router = Router()
const aiAuditInsightsController = container.resolve('aiAuditInsightsController')
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return next(new AppError('Forbidden', 403, 'FORBIDDEN'))
  }
  next()
}

router.get('/summary', authenticate, requireAdmin, aiAuditInsightsController.getSummary.bind(aiAuditInsightsController))
router.get('/events', authenticate, requireAdmin, aiAuditInsightsController.getRecentEvents.bind(aiAuditInsightsController))

module.exports = router
