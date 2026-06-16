class PatientHistory {
  constructor({ id, condition, status, diagnosedAt, notes, createdAt, updatedAt }) {
    this.id = id
    this.condition = condition
    this.status = status
    this.diagnosedAt = diagnosedAt
    this.notes = notes
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  getCondition() {
    return this.condition
  }

  static fromRow(row) {
    if (!row) return null
    return new PatientHistory({
      id: row.id,
      condition: row.condition,
      status: row.status,
      diagnosedAt: row.diagnosed_at,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  }
}

module.exports = PatientHistory
