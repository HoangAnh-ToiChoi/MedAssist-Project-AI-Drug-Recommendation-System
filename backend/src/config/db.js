const { Pool } = require('pg')

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set in .env file')
  console.error('Make sure .env file exists in backend/ directory (not backend/src/)')
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

// Log connection details (masking password for security)
const dbUrl = process.env.DATABASE_URL
const maskedUrl = dbUrl.replace(/:[^@]*@/, ':***@')
console.log('📊 Database config:', {
  url: maskedUrl,
  pool: { max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 },
  ssl: 'enabled (rejectUnauthorized: false for Supabase)',
})

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message)
  console.error('Error code:', err.code)
  console.error('Full error:', err)
})

pool.on('connect', () => {
  console.log('✅ New connection established to database')
})

module.exports = pool
