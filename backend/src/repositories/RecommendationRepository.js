class RecommendationRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async create({ userId, inputSymptoms, outputDrugs, dangerAlert, engineVersion }) {
    const { rows } = await this.#pool.query(
      `INSERT INTO recommendations (user_id, input_symptoms, output_drugs, danger_alert, engine_version)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [userId, JSON.stringify(inputSymptoms), JSON.stringify(outputDrugs), dangerAlert, engineVersion]
    )
    return rows[0]
  }
}

module.exports = RecommendationRepository
