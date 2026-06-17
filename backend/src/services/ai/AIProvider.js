/**
 * @interface AIProvider
 */
class AIProvider {
  /**
   * @param {string[]} symptoms
   * @param {string[]} history
   * @param {object[]} allergies
   * @returns {Promise<{engineVersion: string, recommendations: object[], dangerAlert: string|null}>}
   */
  async getRecommendations(symptoms, history, allergies) {
    throw new Error('Method not implemented')
  }
}

module.exports = AIProvider
