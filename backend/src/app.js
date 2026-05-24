const express = require('express')
const cors = require('cors')
const errorHandler = require('./middlewares/errorHandler')
const authRoutes = require('./routes/authRoutes')
const symptomRoutes = require('./routes/symptomRoutes')

const app = express()

const allowedOrigin = (origin, callback) => {
  if (!origin) return callback(null, true)
  if (process.env.NODE_ENV === 'development' && /^http:\/\/localhost:\d+$/.test(origin)) {
    return callback(null, true)
  }
  if (origin === (process.env.FRONTEND_URL || 'http://localhost:5173')) {
    return callback(null, true)
  }
  callback(new Error('Not allowed by CORS'))
}

app.use(cors({
  origin: allowedOrigin,
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logger middleware cho moi truong development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
      const duration = Date.now() - start
      console.log(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`)
    })
    next()
  })
}

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/symptoms', symptomRoutes)

app.use(errorHandler)

module.exports = app
