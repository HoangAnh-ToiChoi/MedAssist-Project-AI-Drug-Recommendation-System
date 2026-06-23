const express = require('express')
const cors = require('cors')
const errorHandler = require('./middlewares/errorHandler')
const authRoutes = require('./routes/authRoutes')
const symptomRoutes = require('./routes/symptomRoutes')
const specialtyRoutes = require('./routes/specialtyRoutes')
const historyRoutes = require('./routes/historyRoutes')
const allergyRoutes = require('./routes/allergyRoutes')
const chatbotRoutes = require('./routes/chatbotRoutes')
const aiInsightsRoutes = require('./routes/aiInsightsRoutes')
const appConfig = require('./config/appConfig')

const logger = require('./utils/logger')

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

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`)
  })
  next()
})

app.get('/health', async (req, res) => {
  const pool = require('./config/db')
  const redisClient = require('./config/redis')
  const [databaseCheck, redisCheck] = await Promise.allSettled([
    pool.query('SELECT 1'),
    redisClient.ping(),
  ])

  const databaseStatus = databaseCheck.status === 'fulfilled' ? 'up' : 'down'
  const redisStatus = redisCheck.status === 'fulfilled' ? 'up' : 'down'

  res.json({
    status: databaseStatus === 'up' ? (redisStatus === 'up' ? 'ok' : 'degraded') : 'degraded',
    timestamp: new Date().toISOString(),
    environment: appConfig.env,
    uptimeSeconds: Math.round(process.uptime()),
    ai: {
      serviceConfigured: Boolean(appConfig.ai.serviceUrl),
      timeoutMs: appConfig.ai.serviceTimeoutMs,
      explanationsEnabled: appConfig.ai.explanationsEnabled,
    },
    services: {
      database: {
        status: databaseStatus,
      },
      redis: {
        status: redisStatus,
      },
    },
  })
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/symptoms', symptomRoutes)
app.use('/api/v1/specialties', specialtyRoutes)
app.use('/api/v1/history', historyRoutes)
app.use('/api/v1/allergies', allergyRoutes)
app.use('/api/v1/chatbot', chatbotRoutes)
app.use('/api/v1/ai/insights', aiInsightsRoutes)

app.use(errorHandler)

module.exports = app
