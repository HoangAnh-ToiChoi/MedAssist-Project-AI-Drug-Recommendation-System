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
const memoryStore = new Map()

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

const setMemoryValue = (key, value, ttlSeconds) => {
  const expiresAt = Number.isFinite(ttlSeconds) ? Date.now() + (ttlSeconds * 1000) : null
  memoryStore.set(key, { value, expiresAt })
}

const getMemoryValue = (key) => {
  const entry = memoryStore.get(key)
  if (!entry) return null
  if (entry.expiresAt && entry.expiresAt <= Date.now()) {
    memoryStore.delete(key)
    return null
  }
  return entry.value
}

const fallbackClient = {
  async get(key) {
    if (connected) return client.get(key)
    return getMemoryValue(key)
  },
  async setEx(key, ttlSeconds, value) {
    if (connected) return client.setEx(key, ttlSeconds, value)
    setMemoryValue(key, value, ttlSeconds)
    return 'OK'
  },
  async del(...keys) {
    if (connected) return client.del(...keys)
    let deleted = 0
    keys.flat().forEach((key) => {
      if (memoryStore.delete(key)) deleted += 1
    })
    return deleted
  },
  async ping() {
    if (connected) return client.ping()
    return 'MEMORY_FALLBACK'
  },
  get isMemoryFallback() {
    return !connected
  },
  on(...args) {
    return client.on(...args)
  },
}

module.exports = fallbackClient
