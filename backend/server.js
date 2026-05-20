require('dotenv').config()
const app = require('./src/app')
const pool = require('./src/config/db')

const PORT = process.env.PORT || 3000

const start = async () => {
  try {
    await pool.query('SELECT 1')
    console.log('PostgreSQL connected')

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (err) {
    console.error('Failed to connect to database:', err.message)
    process.exit(1)
  }
}

start()
