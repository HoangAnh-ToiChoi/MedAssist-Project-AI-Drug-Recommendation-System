/**
 * AI Service Configuration
 * This module only reports key availability in the current build.
 * The application currently calls AI via AI_SERVICE_URL in RecommendationService.
 */
const logger = require('../utils/logger')

const openaiKey = process.env.OPENAI_API_KEY
const googleKey = process.env.GOOGLE_API_KEY

const hasOpenAI = !!openaiKey && openaiKey !== 'your_openai_api_key_here'
const hasGemini = !!googleKey && googleKey !== 'your_gemini_api_key_here'

if (!hasOpenAI && !hasGemini) {
  logger.warn('No AI API keys configured.')
  logger.warn('Set OPENAI_API_KEY or GOOGLE_API_KEY in .env if you plan to use provider SDKs later.')
}

const aiConfig = {
  openai: {
    enabled: hasOpenAI,
    apiKey: openaiKey,
    model: 'gpt-3.5-turbo',
  },
  gemini: {
    enabled: hasGemini,
    apiKey: googleKey,
    model: 'gemini-pro',
  },
  activeProvider: hasOpenAI ? 'openai' : hasGemini ? 'gemini' : null,
}

let openaiClient = null
if (hasOpenAI) {
  logger.info('OpenAI API key detected. SDK client is not initialized in this build.')
}

let geminiClient = null
if (hasGemini) {
  logger.info('Google Gemini API key detected. SDK client is not initialized in this build.')
}

const getAIClient = () => {
  if (aiConfig.activeProvider === 'openai' && openaiClient) {
    return openaiClient
  }
  if (aiConfig.activeProvider === 'gemini' && geminiClient) {
    return geminiClient
  }
  return null
}

const getActiveProvider = () => aiConfig.activeProvider

module.exports = {
  aiConfig,
  getAIClient,
  getActiveProvider,
  openaiClient,
  geminiClient,
}
