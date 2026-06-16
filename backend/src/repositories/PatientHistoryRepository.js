const PatientHistory = require('../entities/PatientHistory')

class PatientHistoryRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async findChronicDiseasesByUserId(userId) {
    const { rows } = await this.#pool.query(
      `SELECT condition
       FROM patient_history
       WHERE user_id = $1
         AND status IN ('active', 'chronic')
       ORDER BY created_at DESC`,
      [userId]
    )
    return rows.map((row) => PatientHistory.fromRow(row))
  }

  async findCurrentMedicationsByUserId(userId) {
    return []
  }

  async findAllByUserId(userId) {
    const { rows } = await this.#pool.query(
      `SELECT id, condition, status, diagnosed_at, notes, created_at, updated_at
       FROM patient_history
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )

    return rows.map((row) => PatientHistory.fromRow(row))
  }

  async createForUser(userId, payload) {
    const { rows } = await this.#pool.query(
      `INSERT INTO patient_history (user_id, condition, status, diagnosed_at, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, condition, status, diagnosed_at, notes, created_at, updated_at`,
      [
        userId,
        payload.condition,
        payload.status || 'active',
        payload.diagnosedAt || null,
        payload.notes || null,
      ]
    )

    return PatientHistory.fromRow(rows[0])
  }

  async updateByIdAndUserId(historyId, userId, payload) {
    const updates = []
    const values = [historyId, userId]

    this.#addUpdate(updates, values, payload, 'condition', 'condition')
    this.#addUpdate(updates, values, payload, 'status', 'status')
    this.#addUpdate(updates, values, payload, 'diagnosedAt', 'diagnosed_at')
    this.#addUpdate(updates, values, payload, 'notes', 'notes')

    if (!updates.length) return null

    const { rows } = await this.#pool.query(
      `UPDATE patient_history
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, condition, status, diagnosed_at, notes, created_at, updated_at`,
      values
    )

    return PatientHistory.fromRow(rows[0])
  }

  async deleteByIdAndUserId(historyId, userId) {
    const { rowCount } = await this.#pool.query(
      `DELETE FROM patient_history
       WHERE id = $1 AND user_id = $2`,
      [historyId, userId]
    )

    return rowCount > 0
  }

  #addUpdate(updates, values, payload, field, column) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) return

    values.push(payload[field])
    updates.push(`${column} = $${values.length}`)
  }
}

module.exports = PatientHistoryRepository
