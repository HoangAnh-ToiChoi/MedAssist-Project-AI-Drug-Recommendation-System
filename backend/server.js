require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors({ origin: '*' }))
app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }))

// Register chat route
const chatRoutes = require('./src/routes/chatRoutes')
app.use('/api', chatRoutes)

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Backend server running on port :${PORT}`)
})

module.exports = app
