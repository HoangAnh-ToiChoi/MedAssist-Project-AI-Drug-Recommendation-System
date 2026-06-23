/**
 * @interface AIProvider
 */
class AIProvider {
  /**
   * @param {string} specialty
   * @param {string[]} symptoms
   * @param {string[]} history
   * @param {object[]} allergies
   * @returns {Promise<{
   *   engineVersion: string,
   *   recommendations: object[],
   *   topDiseases?: object[],
   *   matchedSymptoms?: string[],
   *   dangerAlert: string|null
   * }>}
   */
  async getRecommendations(specialty, symptoms, history, allergies) {
    throw new Error('Method not implemented')
  }

  /**
   * @param {object} payload
   * @returns {Promise<{
   *   enabled?: boolean,
   *   status?: string,
   *   provider?: string|null,
   *   summary?: string,
   *   explanation?: string,
   *   safetyNote?: string,
   *   error?: string,
   *   quality?: object
   * }>}
   */
  async explainGroundedRecommendation(payload) {
    void payload
    return null
  }

  /**
   * @param {object} payload
   * @returns {Promise<{
   *   success?: boolean,
   *   provider?: string|null,
   *   answer?: string,
   *   safetyNote?: string,
   *   error?: string,
   *   quality?: object
   * }>}
   */
  async chatGroundedRecommendation(payload) {
    void payload
    return null
  }
}

module.exports = AIProvider
