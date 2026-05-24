class PatientHistoryRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  // Query patient conditions from database. In the database schema, this table uses 'condition' column instead of 'title'.
  async findChronicDiseasesByUserId(userId) {
    const { rows } = await this.#pool.query(
      "SELECT condition FROM patient_history WHERE user_id = $1",
      [userId]
    )
    return rows.map(r => r.condition)
  }

  // The database schema currently does not store current medications for a patient, returning an empty list to prevent errors.
  async findCurrentMedicationsByUserId(userId) {
    return []
  }
}

module.exports = PatientHistoryRepository
