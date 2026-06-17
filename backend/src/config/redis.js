const { createClient } = require('redis')
const logger = require('../utils/logger')
const appConfig = require('./appConfig')

const client = createClient({
  url: appConfig.redisUrl,
  socket: {
    // Thử lại tối đa 3 lần, sau đó dừng
    reconnectStrategy: (retries) => {
      if (retries >= 3) return false
      return Math.min(retries * 200, 1000)
    },
  },
})

let connected = false

client.on('connect', () => {
  connected = true
  logger.info('Redis connected successfully')
})

client.on('disconnect', () => {
  connected = false
  logger.info('Redis disconnected')
})

client.on('error', (err) => {
  if (!connected) {
    logger.error(`Redis unavailable: ${err.message.split('\n')[0]}`)
  }
})

client.connect().catch(() => {})

module.exports = client
