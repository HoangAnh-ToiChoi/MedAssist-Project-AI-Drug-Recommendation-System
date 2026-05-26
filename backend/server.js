require('dotenv').config()
const app = require('./src/app')
const pool = require('./src/config/db')
const { aiConfig } = require('./src/config/ai')

const PORT = process.env.PORT || 3000

const start = async () => {
  try {
    console.log('\n🚀 Starting MedAssist Backend...\n')

    // Test database connection
    console.log('🔗 Testing PostgreSQL connection...')
    const result = await pool.query('SELECT 1')
    console.log('✅ PostgreSQL connected successfully\n')

    // Log AI configuration status
    console.log('🤖 AI Configuration:')
    if (aiConfig.activeProvider) {
      console.log(`   ✅ Active Provider: ${aiConfig.activeProvider.toUpperCase()}`)
    } else {
      console.log('   ⚠️  No AI provider configured (optional for now)')
    }
    console.log()

    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`)
      console.log(`📝 Environment: ${process.env.NODE_ENV}`)
      console.log(`🌐 Frontend URL: ${process.env.Frontend_url}\n`)
    })
  } catch (err) {
    console.error('\n❌ Failed to start server:\n')
    console.error('Error Details:')
    console.error('  Message:', err.message)
    console.error('  Code:', err.code)
    console.error('  Hint:', err.hint)
    console.error('\nTroubleshooting:')
    
    if (err.code === 'ENOTFOUND') {
      console.error('  → Cannot find database host (DNS resolution failed)')
      console.error('  → Check DATABASE_URL in .env file')
      console.error('  → Verify Supabase project is running')
    } else if (err.code === 'ECONNREFUSED') {
      console.error('  → Connection refused (host is unreachable)')
      console.error('  → Check if port 6543 (pooler) or 5432 (direct) is correct')
      console.error('  → Check firewall rules for Supabase access')
    } else if (err.message.includes('authentication')) {
      console.error('  → Database authentication failed')
      console.error('  → Check username and password in DATABASE_URL')
      console.error('  → Ensure special characters are URL-encoded (% prefix)')
    } else if (err.code === 'ETIMEDOUT') {
      console.error('  → Connection timeout')
      console.error('  → Check network connectivity to Supabase')
      console.error('  → Try adjusting connectionTimeoutMillis in db.js')
    }
    
    process.exit(1)
  }
}

start()
