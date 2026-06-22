class Disease {
  constructor({
    id,
    code,
    displayName,
    canonicalName,
    icd10Code,
    diseaseTypeCode,
    score,
  }) {
    this.id = id
    this.code = code
    this.displayName = displayName
    this.canonicalName = canonicalName
    this.icd10Code = icd10Code
    this.diseaseTypeCode = diseaseTypeCode
    this.score = score
  }

  static fromRow(row) {
    if (!row) return null

    return new Disease({
      id: row.id,
      code: row.code,
      displayName: row.display_name,
      canonicalName: row.canonical_name,
      icd10Code: row.icd10_code,
      diseaseTypeCode: row.disease_type_code,
      score: row.score,
    })
  }
}

module.exports = Disease
