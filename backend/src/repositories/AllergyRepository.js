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
    // Trả về cả tên biệt dược và tên hoạt chất để lọc dị ứng chính xác nhất
    const names = new Set()
    rows.forEach(r => {
      if (r.name) names.add(r.name)
      if (r.generic_name) names.add(r.generic_name)
    })
    return Array.from(names)
  }
}

module.exports = AllergyRepository
