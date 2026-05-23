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
    return rows
  }
}

module.exports = AllergyRepository
