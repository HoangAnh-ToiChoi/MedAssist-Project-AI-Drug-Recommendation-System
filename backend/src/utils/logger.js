const winston = require('winston')
const appConfig = require('../config/appConfig')

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (appConfig.env === 'development' ? 'debug' : 'info'),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    appConfig.env === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, stack }) => {
            return `[${timestamp}] ${level}: ${message}${stack ? `\n${stack}` : ''}`
          })
        )
  ),
  transports: [
    new winston.transports.Console()
  ],
})

module.exports = logger
