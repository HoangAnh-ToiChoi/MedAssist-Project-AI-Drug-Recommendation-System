const axios = require('axios')
const AIProvider = require('./AIProvider')

class HttpAiServiceEngine extends AIProvider {
  #url
  #timeout

  constructor(url, timeout = 1500) {
    super()
    this.#url = url
    this.#timeout = timeout
  }

  async getRecommendations(symptoms, history, allergies) {
    if (!this.#url) {
      throw new Error('AI service URL is not configured')
    }

    const { data } = await axios.post(
      `${this.#url}/ai/recommend`,
      {
        symptoms,
        history,
        allergies,
      },
      {
        timeout: this.#timeout,
      }
    )

    return {
      engineVersion: data.engine_version || 'ai-service-v1',
      recommendations: data.recommendations || [],
      dangerAlert: data.danger_alert || null,
    }
  }
}

module.exports = HttpAiServiceEngine
