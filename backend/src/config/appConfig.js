/**
 * Centralized Application Configuration
 */
const appConfig = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database config values are managed via pg pool, but we keep URL here
  databaseUrl: process.env.DATABASE_URL,

  // Redis configurations
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Authentication configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    
    // OTP logic settings
    otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS) || 10 * 60,
    otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 3,
    
    // Password reset settings
    resetTokenTtlSeconds: Number(process.env.RESET_TOKEN_TTL_SECONDS) || 15 * 60,
    
    // Login block settings
    loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS) || 5,
    loginLockTtlSeconds: Number(process.env.LOGIN_LOCK_TTL_SECONDS) || 15 * 60,
    refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS) || 7 * 24 * 60 * 60,
  },

  // Cache configuration
  cache: {
    recommendationTtlSeconds: Number(process.env.RECOMMENDATION_CACHE_TTL_SECONDS) || 3600,
    symptomsTtlSeconds: Number(process.env.SYMPTOMS_CACHE_TTL_SECONDS) || 3600,
  },

  // AI configurations
  ai: {
    serviceUrl: process.env.AI_SERVICE_URL || '',
    serviceTimeoutMs: Number(process.env.AI_SERVICE_TIMEOUT_MS) || 1500,
  },

  // Email SMTP transporter configuration
  email: {
    from: process.env.EMAIL_FROM || 'MedAssist <noreply@medassist.com>',
  }
}

module.exports = appConfig
