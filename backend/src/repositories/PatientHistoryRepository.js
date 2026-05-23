class PatientHistoryRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async findAllByUserId(userId) {
    const { rows } = await this.#pool.query(
      'SELECT entry_type, title FROM patient_history WHERE user_id = $1',
      [userId]
    )
    return rows
  }
}

module.exports = PatientHistoryRepository
