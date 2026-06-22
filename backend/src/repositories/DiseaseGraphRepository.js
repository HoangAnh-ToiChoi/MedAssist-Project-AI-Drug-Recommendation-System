const Disease = require('../entities/Disease')
const DiseaseType = require('../entities/DiseaseType')
const Symptom = require('../entities/Symptom')

class DiseaseGraphRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async findSpecialties() {
    const { rows } = await this.#pool.query(
      `SELECT id, code, name, description, display_order
       FROM disease_types
       ORDER BY display_order ASC, name ASC`
    )

    return rows.map((row) => DiseaseType.fromRow(row))
  }

  async findSymptomsBySpecialtyCode(specialtyCode) {
    const normalizedSpecialtyCode = this.#normalizeSingleValue(specialtyCode)
    if (!normalizedSpecialtyCode) return []

    const { rows } = await this.#pool.query(
      `SELECT DISTINCT s.id, s.code, s.name
       FROM symptoms s
       JOIN disease_symptoms ds ON ds.symptom_id = s.id
       JOIN diseases d ON d.id = ds.disease_id
       JOIN disease_types dt ON dt.id = d.disease_type_id
       WHERE LOWER(TRIM(dt.code)) = $1
       ORDER BY s.name ASC`,
      [normalizedSpecialtyCode]
    )

    return rows.map((row) => Symptom.fromRow(row))
  }

  async findDiseasesBySpecialtyCode(specialtyCode) {
    const normalizedSpecialtyCode = this.#normalizeSingleValue(specialtyCode)
    if (!normalizedSpecialtyCode) return []

    const { rows } = await this.#pool.query(
      `SELECT
         d.id,
         d.code,
         d.display_name,
         d.canonical_name,
         d.icd10_code,
         dt.code AS disease_type_code
       FROM diseases d
       JOIN disease_types dt ON dt.id = d.disease_type_id
       WHERE LOWER(TRIM(dt.code)) = $1
       ORDER BY d.display_name ASC, d.canonical_name ASC`,
      [normalizedSpecialtyCode]
    )

    return rows.map((row) => Disease.fromRow(row))
  }

  async resolveSymptomCodesWithinSpecialty(specialtyCode, inputs) {
    const normalizedSpecialtyCode = this.#normalizeSingleValue(specialtyCode)
    const normalizedInputs = this.#normalizeValues(inputs)

    if (!normalizedSpecialtyCode || normalizedInputs.length === 0) return []

    const { rows } = await this.#pool.query(
      `SELECT DISTINCT
         s.code,
         LOWER(TRIM(s.name)) AS normalized_name,
         LOWER(TRIM(s.code)) AS normalized_code
       FROM symptoms s
       JOIN disease_symptoms ds ON ds.symptom_id = s.id
       JOIN diseases d ON d.id = ds.disease_id
       JOIN disease_types dt ON dt.id = d.disease_type_id
       WHERE LOWER(TRIM(dt.code)) = $1
         AND (
           LOWER(TRIM(s.name)) = ANY($2)
           OR LOWER(TRIM(s.code)) = ANY($2)
         )`,
      [normalizedSpecialtyCode, normalizedInputs]
    )

    const resolvedByInput = new Map()

    for (const row of rows) {
      if (row.normalized_name) resolvedByInput.set(row.normalized_name, row.code)
      if (row.normalized_code) resolvedByInput.set(row.normalized_code, row.code)
    }

    return [...new Set(
      normalizedInputs
        .map((input) => resolvedByInput.get(input))
        .filter(Boolean)
    )]
  }

  async findDiseaseCandidatesBySymptomCodes(specialtyCode, symptomCodes) {
    const normalizedSpecialtyCode = this.#normalizeSingleValue(specialtyCode)
    const normalizedSymptomCodes = this.#normalizeValues(symptomCodes)

    if (!normalizedSpecialtyCode || normalizedSymptomCodes.length === 0) return []

    const { rows } = await this.#pool.query(
      `SELECT
         d.id,
         d.code,
         d.display_name,
         d.canonical_name,
         d.icd10_code,
         dt.code AS disease_type_code,
         SUM(COALESCE(ds.confidence_score, 0)) AS score
       FROM diseases d
       JOIN disease_types dt ON dt.id = d.disease_type_id
       JOIN disease_symptoms ds ON ds.disease_id = d.id
       JOIN symptoms s ON s.id = ds.symptom_id
       WHERE LOWER(TRIM(dt.code)) = $1
         AND (
           LOWER(TRIM(s.code)) = ANY($2)
           OR LOWER(TRIM(s.name)) = ANY($2)
         )
       GROUP BY d.id, d.code, d.display_name, d.canonical_name, d.icd10_code, dt.code
       ORDER BY score DESC, d.display_name ASC
       LIMIT 10`,
      [normalizedSpecialtyCode, normalizedSymptomCodes]
    )

    return rows.map((row) => Disease.fromRow(row))
  }

  async findDrugCandidatesByDiseaseIds(diseaseIds) {
    const normalizedDiseaseIds = [...new Set(
      (diseaseIds || [])
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    )]

    if (normalizedDiseaseIds.length === 0) return []

    const { rows } = await this.#pool.query(
      `WITH disease_drug_scores AS (
         SELECT
           dr.id,
           dr.name,
           dr.generic_name,
           dr.category,
           dr.description,
           dr.contraindications,
           SUM(COALESCE(dd.confidence_score, 0)) AS confidence,
           MIN(dd.priority_rank) AS priority_rank
         FROM disease_drugs dd
         JOIN drugs dr ON dr.id = dd.drug_id
         WHERE dd.disease_id = ANY($1::uuid[])
         GROUP BY dr.id, dr.name, dr.generic_name, dr.category, dr.description, dr.contraindications
       ),
       ranked_drugs AS (
         SELECT
           *,
           ROW_NUMBER() OVER (
             PARTITION BY LOWER(COALESCE(NULLIF(generic_name, ''), name))
             ORDER BY confidence DESC, priority_rank ASC, name ASC
           ) AS generic_rank
         FROM disease_drug_scores
       )
       SELECT
         name,
         generic_name,
         category,
         description,
         contraindications,
         confidence,
         priority_rank
       FROM ranked_drugs
       WHERE generic_rank = 1
       ORDER BY confidence DESC, priority_rank ASC, name ASC`,
      [normalizedDiseaseIds]
    )

    return rows.map((row) => ({
      name: row.name,
      generic_name: row.generic_name,
      category: row.category,
      description: row.description,
      contraindications: row.contraindications,
      confidence: row.confidence,
      priority_rank: row.priority_rank,
    }))
  }

  #normalizeSingleValue(value) {
    const normalized = String(value || '').trim().toLowerCase()
    return normalized || null
  }

  #normalizeValues(values) {
    return [...new Set(
      (values || [])
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean)
    )]
  }
}

module.exports = DiseaseGraphRepository
