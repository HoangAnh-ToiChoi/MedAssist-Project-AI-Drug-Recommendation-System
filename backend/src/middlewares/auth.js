// backend/src/middlewares/auth.js
const jwt = require('jsonwebtoken')
const AppError = require('../utils/AppError')

const authenticate = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'))
  }

  const token = header.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload.type && payload.type !== 'access') {
      return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'))
    }
    req.user = { id: payload.userId, userId: payload.userId, role: payload.role }
    next()
  } catch (err) {
    next(err)
  }
}

module.exports = authenticate
