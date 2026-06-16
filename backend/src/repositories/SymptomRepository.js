const Symptom = require('../entities/Symptom');

class SymptomRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async findAll() {
    const { rows } = await this.#pool.query(
      'SELECT id, code, name FROM symptoms ORDER BY name ASC'
    )
    return rows.map(r => Symptom.fromRow(r));
  }
}

module.exports = SymptomRepository
