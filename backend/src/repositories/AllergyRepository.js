const Allergy = require('../entities/Allergy');

class AllergyRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async findAllByUserId(userId) {
    const { rows } = await this.#pool.query(
      `SELECT d.name, d.generic_name 
       FROM allergies a
       JOIN drugs d ON a.drug_id = d.id
       WHERE a.user_id = $1`,
      [userId]
    )
    return rows.map(r => Allergy.fromRow(r));
  }
}

module.exports = AllergyRepository
