const axios = require('axios')
const AIProvider = require('./AIProvider')

class HttpAiServiceEngine extends AIProvider {
  #url
  #timeout
  #provider

  constructor(url, timeout = 1500) {
    super()
    this.#url = url
    this.#timeout = timeout
    this.#provider = 'ai-service'
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

  async explainGroundedRecommendation(payload) {
    if (!this.#url) {
      throw new Error('AI service URL is not configured')
    }

    const requestPayload = {
      specialty: payload.specialty,
      matched_symptoms: payload.matchedSymptoms || [],
      danger_alert: payload.dangerAlert || null,
      top_diseases: Array.isArray(payload.topDiseases)
        ? payload.topDiseases.map((disease) => ({
          code: disease.code,
          display_name: disease.displayName || disease.display_name || disease.name || disease.code,
          icd10_code: disease.icd10Code || disease.icd10_code || null,
          score: Number(disease.score || 0),
        }))
        : [],
      recommendations: Array.isArray(payload.recommendations)
        ? payload.recommendations.map((recommendation) => ({
          name: recommendation.name,
          generic_name: recommendation.generic_name || recommendation.genericName || null,
          confidence: Number(recommendation.confidence || 0),
          reason: recommendation.reason || recommendation.description || 'Grounded backend recommendation',
          dosage: recommendation.dosage || null,
          contraindications: recommendation.contraindications || null,
        }))
        : [],
    }

    const { data } = await axios.post(
      `${this.#url}/ai/recommend/explain`,
      requestPayload,
      {
        timeout: this.#timeout,
      }
    )

    const success = data.success !== false

    return {
      enabled: data.enabled ?? success,
      status: data.status || (success ? 'success' : 'fallback'),
      provider: data.provider || (success ? this.#provider : 'none'),
      summary: data.summary || '',
      explanation: data.explanation || data.summary || '',
      safetyNote: data.safety_note || data.safetyNote || '',
      error: data.error || undefined,
    }
  }
}

module.exports = HttpAiServiceEngine
