const AppError = require('../utils/AppError')

/**
 * Middleware to authorize requests based on user roles.
 * Assumes req.user has been populated by the authenticate middleware.
 * 
 * @param {...string} allowedRoles - Roles allowed to access the route (e.g. 'admin', 'user')
 * @returns {Function} Express middleware
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Unauthorized: User not authenticated', 401, 'UNAUTHORIZED'))
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden: You do not have permission', 403, 'FORBIDDEN_ERROR'))
    }

    next()
  }
}

module.exports = authorizeRoles
