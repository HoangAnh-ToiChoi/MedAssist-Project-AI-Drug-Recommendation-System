class Allergy {
  constructor({ name, genericName }) {
    this.name = name
    this.genericName = genericName
  }

  isAllergicTo(drug) {
    if (!drug) return false

    const drugNames = [
      String(drug.name || '').trim().toLowerCase(),
      String(drug.generic_name || '').trim().toLowerCase(),
    ].filter(Boolean)

    const allergyNames = [
      String(this.name || '').trim().toLowerCase(),
      String(this.genericName || '').trim().toLowerCase(),
    ].filter(Boolean)

    if (drugNames.length === 0 || allergyNames.length === 0) return false

    return allergyNames.some((allergyName) =>
      drugNames.some((drugName) =>
        drugName === allergyName ||
        drugName.includes(allergyName) ||
        allergyName.includes(drugName)
      )
    )
  }

  static fromRow(row) {
    if (!row) return null

    return new Allergy({
      name: row.name,
      genericName: row.generic_name,
    })
  }
}

module.exports = Allergy
