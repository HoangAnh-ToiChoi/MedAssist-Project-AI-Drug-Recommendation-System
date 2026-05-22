const express = require('express')
const cors = require('cors')
const errorHandler = require('./middlewares/errorHandler')
const authRoutes = require('./routes/authRoutes')
const symptomRoutes = require('./routes/symptomRoutes')

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/symptoms', symptomRoutes)

app.use(errorHandler)

module.exports = app
