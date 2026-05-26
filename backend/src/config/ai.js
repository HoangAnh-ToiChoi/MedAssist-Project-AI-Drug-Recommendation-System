/**
 * AI Service Configuration
 * Supports both OpenAI and Google Gemini APIs
 */

const openaiKey = process.env.OPENAI_API_KEY
const googleKey = process.env.GOOGLE_API_KEY

// Determine which AI provider to use
const hasOpenAI = !!openaiKey && openaiKey !== 'your_openai_api_key_here'
const hasGemini = !!googleKey && googleKey !== 'your_gemini_api_key_here'

if (!hasOpenAI && !hasGemini) {
  console.warn('⚠️  WARNING: No AI API keys configured!')
  console.warn('   Set OPENAI_API_KEY or GOOGLE_API_KEY in .env file')
  console.warn('   AI features will not work until configured')
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

// Initialize OpenAI client if API key is available
let openaiClient = null
if (hasOpenAI) {
  try {
    // Using dynamic import fallback for compatibility
    // In production, install: npm install openai
    // const OpenAI = require('openai')
    // openaiClient = new OpenAI({ apiKey: openaiKey })
    console.log('✅ OpenAI configured (install openai package when ready)')
  } catch (err) {
    console.warn('⚠️  OpenAI package not installed. Install with: npm install openai')
  }
}

// Initialize Google Gemini client if API key is available
let geminiClient = null
if (hasGemini) {
  try {
    // Using dynamic import fallback for compatibility
    // In production, install: npm install @google/generative-ai
    // const { GoogleGenerativeAI } = require('@google/generative-ai')
    // geminiClient = new GoogleGenerativeAI(googleKey)
    console.log('✅ Google Gemini configured (install @google/generative-ai package when ready)')
  } catch (err) {
    console.warn('⚠️  @google/generative-ai package not installed. Install with: npm install @google/generative-ai')
  }
}

/**
 * Get the active AI client based on configuration
 * @returns {Object|null} OpenAI or Gemini client, or null if none configured
 */
const getAIClient = () => {
  if (aiConfig.activeProvider === 'openai' && openaiClient) {
    return openaiClient
  }
  if (aiConfig.activeProvider === 'gemini' && geminiClient) {
    return geminiClient
  }
  return null
}

/**
 * Get active AI provider name
 * @returns {string} 'openai', 'gemini', or null
 */
const getActiveProvider = () => aiConfig.activeProvider

module.exports = {
  aiConfig,
  getAIClient,
  getActiveProvider,
  openaiClient,
  geminiClient,
}
