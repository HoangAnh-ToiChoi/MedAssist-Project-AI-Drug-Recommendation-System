const { Pool, types } = require('pg')
const logger = require('../utils/logger')

// Configure pg to return DATE (OID 1082) as a plain YYYY-MM-DD string to prevent timezone offset shifts
types.setTypeParser(types.builtins.DATE, (val) => val)

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  logger.error('❌ ERROR: DATABASE_URL is not set in .env file')
  logger.error('Make sure .env file exists in backend/ directory (not backend/src/)')
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
logger.info(`📊 Database config loaded - Pool Max: 10, IdleTimeout: 30000ms, ConnTimeout: 5000ms, Masked URL: ${maskedUrl}`)

pool.on('error', (err) => {
  logger.error(`❌ PostgreSQL pool error: ${err.message}`, {
    code: err.code,
    error: err,
  })
})

pool.on('connect', () => {
  logger.info('✅ New connection established to database')
})

module.exports = pool
