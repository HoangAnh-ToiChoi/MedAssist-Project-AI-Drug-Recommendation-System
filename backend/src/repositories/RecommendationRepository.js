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

  async resolveSymptomCodes(inputs) {
    if (!inputs || inputs.length === 0) return []
    const { rows } = await this.#pool.query(
      `SELECT DISTINCT code 
       FROM symptoms 
       WHERE name = ANY($1) OR code = ANY($1)`,
      [inputs]
    )
    return rows.map((row) => row.code)
  }

  async findRecommendedDrugsBySymptomCodes(symptomCodes) {
    if (!symptomCodes || symptomCodes.length === 0) return []

    const { rows } = await this.#pool.query(
      `SELECT DISTINCT ON (d.name)
         d.name,
         d.generic_name,
         d.category,
         d.description,
         d.contraindications,
         ds.confidence_score AS confidence
       FROM drugs d
       JOIN drug_symptoms ds ON d.id = ds.drug_id
       JOIN symptoms s ON s.id = ds.symptom_id
       WHERE s.code = ANY($1) OR s.name = ANY($1)
       ORDER BY d.name, ds.confidence_score DESC`,
      [symptomCodes]
    )

    return rows.map((row) => ({
      name: row.name,
      generic_name: row.generic_name,
      confidence: row.confidence,
      category: row.category,
      reason: `Gợi ý thuốc dựa trên các triệu chứng đã chọn.`,
      description: row.description,
      dosage: 'Theo chỉ định của bác sĩ hoặc hướng dẫn sử dụng.',
      contraindications: row.contraindications,
    }))
  }
}

module.exports = RecommendationRepository
