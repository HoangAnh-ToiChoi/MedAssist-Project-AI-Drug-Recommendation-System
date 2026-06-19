const Allergy = require('../entities/Allergy')

class AllergyRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async createAllergy({ userId, drugId, reactionType, severity }) {
    const { rows } = await this.#pool.query(
      `WITH inserted AS (
         INSERT INTO allergies (user_id, drug_id, reaction_type, severity)
         VALUES ($1, $2, $3, $4)
         RETURNING *
       )
       SELECT inserted.*, drugs.name AS drug_name, drugs.generic_name
       FROM inserted
       LEFT JOIN drugs ON inserted.drug_id = drugs.id`,
      [userId, drugId, reactionType || null, severity || null]
    )

    return rows[0]
  }

  async getAllergiesDetailsByUserId(userId) {
    const { rows } = await this.#pool.query(
      `SELECT allergies.*, drugs.name AS drug_name, drugs.generic_name
       FROM allergies
       LEFT JOIN drugs ON allergies.drug_id = drugs.id
       WHERE allergies.user_id = $1
       ORDER BY allergies.created_at DESC`,
      [userId]
    )

    return rows
  }

  async findAllByUserId(userId) {
    const { rows } = await this.#pool.query(
      `SELECT drugs.name, drugs.generic_name
       FROM allergies
       LEFT JOIN drugs ON allergies.drug_id = drugs.id
       WHERE allergies.user_id = $1
       ORDER BY allergies.created_at DESC`,
      [userId]
    )

    return rows.map((row) => Allergy.fromRow(row)).filter(Boolean)
  }

  async searchDrugs(query) {
    if (!query || !query.trim()) {
      const { rows } = await this.#pool.query(
        `SELECT id, name, generic_name, category FROM drugs ORDER BY name ASC LIMIT 20`
      )
      return rows
    }
    const { rows } = await this.#pool.query(
      `SELECT id, name, generic_name, category
       FROM drugs
       WHERE name ILIKE $1 OR generic_name ILIKE $1
       ORDER BY name ASC
       LIMIT 20`,
      [`%${query.trim()}%`]
    )
    return rows
  }

  async getAllDrugs() {
    const { rows } = await this.#pool.query(
      `SELECT id, name, generic_name FROM drugs ORDER BY name ASC`
    )
    return rows
  }

  async updateAllergy({ id, userId, drugId, reactionType, severity }) {
    const { rows } = await this.#pool.query(
      `WITH updated AS (
         UPDATE allergies
         SET drug_id = $3,
             reaction_type = $4,
             severity = $5
         WHERE id = $1 AND user_id = $2
         RETURNING *
       )
       SELECT updated.*, drugs.name AS drug_name, drugs.generic_name
       FROM updated
       LEFT JOIN drugs ON updated.drug_id = drugs.id`,
      [id, userId, drugId, reactionType || null, severity]
    )
    return rows[0]
  }

  async deleteAllergy(userId, id) {
    const { rowCount } = await this.#pool.query(
      `DELETE FROM allergies WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    return rowCount > 0
  }
}

module.exports = AllergyRepository

