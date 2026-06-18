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
}

module.exports = AllergyRepository
