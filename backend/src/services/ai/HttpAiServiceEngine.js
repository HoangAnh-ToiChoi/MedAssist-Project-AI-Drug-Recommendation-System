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

  async getRecommendations(specialty, symptoms, history, allergies) {
    if (!this.#url) {
      throw new Error('AI service URL is not configured')
    }

    const { data } = await axios.post(
      `${this.#url}/ai/recommend`,
      {
        specialty,
        symptoms,
        history,
        allergies,
      },
      {
        timeout: this.#timeout,
      }
    )

    return {
      engineVersion: data.engine_version || 'ai-service-v2',
      recommendations: data.recommendations || [],
      topDiseases: data.top_diseases || [],
      matchedSymptoms: data.matched_symptoms || [],
      dangerAlert: data.danger_alert || null,
    }
  }
}

module.exports = HttpAiServiceEngine
