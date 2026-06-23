class DiseaseType {
  constructor({ id, code, name, description, displayOrder }) {
    this.id = id
    this.code = code
    this.name = name
    this.description = description
    this.displayOrder = displayOrder
  }

  static fromRow(row) {
    if (!row) return null

    return new DiseaseType({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      displayOrder: row.display_order,
    })
  }
}

module.exports = DiseaseType
