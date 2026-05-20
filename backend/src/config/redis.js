const { createClient } = require('redis')

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    // Thử lại tối đa 3 lần, sau đó dừng
    reconnectStrategy: (retries) => {
      if (retries >= 3) return false
      return Math.min(retries * 200, 1000)
    },
  },
})

let connected = false

client.on('connect',    ()    => { connected = true;  console.log('Redis connected') })
client.on('disconnect', ()    => { connected = false })
client.on('error',      (err) => {
  if (!connected) console.error('Redis unavailable:', err.message.split('\n')[0])
})

client.connect().catch(() => {})

module.exports = client
