const { Pool } = require('pg')

class SymptomRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async findAll() {
    const { rows } = await this.#pool.query(
      'SELECT id, code, name FROM symptoms ORDER BY name ASC'
    )
    return rows
  }
}

module.exports = SymptomRepository
