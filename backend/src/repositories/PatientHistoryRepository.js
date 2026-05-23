class PatientHistoryRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  // [Tell Don't Ask] query đúng entry_type ngay tại Repository, không trả all rồi để Service filter
  async findChronicDiseasesByUserId(userId) {
    const { rows } = await this.#pool.query(
      "SELECT title FROM patient_history WHERE user_id = $1 AND entry_type = 'chronic_disease'",
      [userId]
    )
    return rows.map(r => r.title)
  }

  async findCurrentMedicationsByUserId(userId) {
    const { rows } = await this.#pool.query(
      "SELECT title FROM patient_history WHERE user_id = $1 AND entry_type = 'current_medication'",
      [userId]
    )
    return rows.map(r => r.title)
  }
}

module.exports = PatientHistoryRepository
