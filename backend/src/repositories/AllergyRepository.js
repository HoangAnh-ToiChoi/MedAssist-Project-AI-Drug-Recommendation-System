class AllergyRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async findAllByUserId(userId) {
    const { rows } = await this.#pool.query(
      `SELECT d.name AS drug_name
       FROM allergies a
       JOIN drugs d ON a.drug_id = d.id
       WHERE a.user_id = $1`,
      [userId]
    )
    return rows.map((row) => row.drug_name)
  }
}

module.exports = AllergyRepository
