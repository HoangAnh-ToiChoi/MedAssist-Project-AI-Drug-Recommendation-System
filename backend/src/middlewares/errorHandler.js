const AppError = require('../utils/AppError')
const ApiResponse = require('../utils/ApiResponse')

const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json(
      ApiResponse.error(err.message, err.code)
    )
  }

  // Lỗi Joi validation (từ celebrate hoặc middleware validate)
  if (err.name === 'ValidationError') {
    return res.status(400).json(
      ApiResponse.error(err.message, 'VALIDATION_ERROR')
    )
  }

  // Lỗi JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      ApiResponse.error('Token không hợp lệ', 'INVALID_TOKEN')
    )
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      ApiResponse.error('Token đã hết hạn', 'TOKEN_EXPIRED')
    )
  }

  // Unexpected error — không lộ chi tiết ra ngoài
  console.error('Unexpected error:', err)
  return res.status(500).json(
    ApiResponse.error('Lỗi hệ thống, vui lòng thử lại sau', 'INTERNAL_ERROR')
  )
}

module.exports = errorHandler
