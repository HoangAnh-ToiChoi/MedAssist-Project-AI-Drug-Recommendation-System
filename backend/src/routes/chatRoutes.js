const express = require('express')
const router = express.Router()
const chatController = require('../controllers/chatController')

// Simple inline auth middleware for safety on skeleton branch
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided', code: 'UNAUTHORIZED' })
  }
  
  const token = authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ success: false, message: 'Invalid token format', code: 'UNAUTHORIZED' })
  }

  // Decodes the token without verification if JWT_ACCESS_SECRET is missing for preview/dev convenience,
  // but verified if the secret is configured.
  const jwt = require('jsonwebtoken')
  const secret = process.env.JWT_ACCESS_SECRET || 'change_me_access_secret_min_32_chars'
  
  try {
    const decoded = jwt.verify(token, secret)
    req.user = decoded
    next()
  } catch (err) {
    // If it is just a mock token starting with 'mock_access_token', we bypass for easy testing
    if (token.startsWith('mock_access_token') || token === 'mock_admin_access_token' || token === 'mock_khoa_access_token') {
      req.user = { userId: 'mock-user-id', role: 'user' }
      return next()
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token', code: 'UNAUTHORIZED' })
  }
}

router.post('/chat', verifyToken, chatController.chat)

module.exports = router
