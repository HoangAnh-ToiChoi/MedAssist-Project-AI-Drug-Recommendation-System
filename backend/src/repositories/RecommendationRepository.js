const Recommendation = require('../entities/Recommendation');

class RecommendationRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async save(recommendation) {
    if (recommendation.isNew()) {
      const { rows } = await this.#pool.query(
        `INSERT INTO recommendations (user_id, input_symptoms, output_drugs, ai_version, danger_alert)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at`,
        [
          recommendation.userId, 
          JSON.stringify(recommendation.inputSymptoms), 
          JSON.stringify(recommendation.outputDrugs), 
          recommendation.aiVersion,
          recommendation.dangerAlert ? JSON.stringify(recommendation.dangerAlert) : null
        ]
      )
      const insertedRow = rows[0];
      recommendation.id = insertedRow.id;
      recommendation.createdAt = insertedRow.created_at;
      return recommendation;
    } else {
      // Assuming update is not currently needed, but we can implement it if necessary
      return recommendation;
    }
  }
}

module.exports = RecommendationRepository
