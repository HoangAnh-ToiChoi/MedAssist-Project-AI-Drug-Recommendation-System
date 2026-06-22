const Recommendation = require('../entities/Recommendation')
const {
  DEFAULT_DOSAGE_GUIDANCE,
  buildRecommendationReason,
} = require('../config/recommendationRules')

class RecommendationRepository {
  #pool
  #diseaseGraphRepository

  constructor(pool, diseaseGraphRepository) {
    this.#pool = pool
    this.#diseaseGraphRepository = diseaseGraphRepository || null
  }

  async save(recommendation) {
    if (!recommendation.isNew()) {
      return recommendation
    }

    const { rows } = await this.#pool.query(
      `INSERT INTO recommendations (user_id, input_symptoms, output_drugs, ai_version, danger_alert)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [
        recommendation.userId,
        JSON.stringify(recommendation.inputSymptoms),
        JSON.stringify(recommendation.outputDrugs),
        recommendation.aiVersion,
        recommendation.dangerAlert ? JSON.stringify(recommendation.dangerAlert) : null,
      ]
    )

    recommendation.id = rows[0].id
    recommendation.createdAt = rows[0].created_at
    return recommendation
  }

  async resolveSymptomCodes(inputs) {
    if (!inputs || inputs.length === 0) return []

    const normalizedInputs = [...new Set(
      inputs
        .map((input) => String(input || '').trim().toLowerCase())
        .filter(Boolean)
    )]

    const { rows } = await this.#pool.query(
      `SELECT DISTINCT code, LOWER(TRIM(name)) AS normalized_name, LOWER(TRIM(code)) AS normalized_code
       FROM symptoms
       WHERE LOWER(TRIM(name)) = ANY($1) OR LOWER(TRIM(code)) = ANY($1)`,
      [normalizedInputs]
    )

    const resolvedByInput = new Map()

    for (const row of rows) {
      if (row.normalized_name) resolvedByInput.set(row.normalized_name, row.code)
      if (row.normalized_code) resolvedByInput.set(row.normalized_code, row.code)
    }

    return [...new Set(
      normalizedInputs.map((input) => resolvedByInput.get(input) || input)
    )]
  }

  async resolveSymptomCodesWithinSpecialty(specialtyCode, inputs) {
    if (this.#diseaseGraphRepository) {
      return this.#diseaseGraphRepository.resolveSymptomCodesWithinSpecialty(
        specialtyCode,
        inputs
      )
    }

    return this.resolveSymptomCodes(inputs)
  }

  async findRecommendedDrugsBySymptomCodes(symptomCodes) {
    if (!symptomCodes || symptomCodes.length === 0) return []

    const normalizedSymptoms = symptomCodes
      .map((code) => String(code || '').trim().toLowerCase())
      .filter(Boolean)

    const { rows } = await this.#pool.query(
      `WITH matched_drugs AS (
         SELECT
           d.id,
           d.name,
           d.generic_name,
           d.category,
           d.description,
           d.contraindications,
           COUNT(DISTINCT s.id) AS matched_symptom_count,
           MAX(ds.confidence_score) AS confidence
         FROM drugs d
         JOIN drug_symptoms ds ON d.id = ds.drug_id
         JOIN symptoms s ON s.id = ds.symptom_id
         WHERE LOWER(TRIM(s.code)) = ANY($1) OR LOWER(TRIM(s.name)) = ANY($1)
         GROUP BY d.id, d.name, d.generic_name, d.category, d.description, d.contraindications
       ),
       ranked_drugs AS (
         SELECT
           *,
           ROW_NUMBER() OVER (
             PARTITION BY LOWER(COALESCE(NULLIF(generic_name, ''), name))
             ORDER BY matched_symptom_count DESC, confidence DESC, name ASC
           ) AS generic_rank
         FROM matched_drugs
       )
       SELECT
         name,
         generic_name,
         category,
         description,
         contraindications,
         matched_symptom_count,
         confidence
       FROM ranked_drugs
       WHERE generic_rank = 1
       ORDER BY matched_symptom_count DESC, confidence DESC, name ASC`,
      [normalizedSymptoms]
    )

    return rows.map((row) => ({
      name: row.name,
      generic_name: row.generic_name,
      confidence: row.confidence,
      category: row.category,
      reason: buildRecommendationReason(row.matched_symptom_count),
      description: row.description,
      dosage: DEFAULT_DOSAGE_GUIDANCE,
      contraindications: row.contraindications,
    }))
  }

  async findDiseaseGraphRecommendations(specialty, symptomCodes) {
    if (!this.#diseaseGraphRepository) {
      return {
        matchedSymptoms: symptomCodes,
        topDiseases: [],
        recommendations: await this.findRecommendedDrugsBySymptomCodes(symptomCodes),
      }
    }

    const topDiseases = await this.#diseaseGraphRepository.findDiseaseCandidatesBySymptomCodes(
      specialty,
      symptomCodes
    )
    const matchedSymptomCount = Array.isArray(symptomCodes) ? symptomCodes.length : 0
    const rankedRecommendations = await this.#diseaseGraphRepository.findDrugCandidatesByDiseaseIds(
      topDiseases.map((item) => item.id)
    )
    const recommendations = rankedRecommendations.map((item) => ({
      ...item,
      reason: item.reason || buildRecommendationReason(matchedSymptomCount),
      dosage: item.dosage || DEFAULT_DOSAGE_GUIDANCE,
    }))

    return {
      matchedSymptoms: symptomCodes,
      topDiseases,
      recommendations,
    }
  }
}

module.exports = RecommendationRepository
