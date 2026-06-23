class Symptom {
  constructor({ id, code, name }) {
    this.id = id;
    this.code = code;
    this.name = name;
  }

  static fromRow(row) {
    if (!row) return null;
    return new Symptom({
      id: row.id,
      code: row.code,
      name: row.name
    });
  }
}

module.exports = Symptom;
