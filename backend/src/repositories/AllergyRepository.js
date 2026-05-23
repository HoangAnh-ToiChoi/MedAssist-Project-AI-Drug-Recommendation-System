class AllergyRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async findAllByUserId(userId) {
    const { rows } = await this.#pool.query(
      'SELECT drug_name FROM allergies WHERE user_id = $1',
      [userId]
    )
    return rows.map(r => r.drug_name)
  }
}

module.exports = AllergyRepository
