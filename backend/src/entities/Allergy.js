class Allergy {
  constructor({ name, genericName }) {
    this.name = name;
    this.genericName = genericName;
  }

  isAllergicTo(drug) {
    if (!drug) return false;
    const lowerDrugName = (drug.name || '').toLowerCase();
    const lowerGenericName = (drug.generic_name || '').toLowerCase();
    
    const isNameMatch = this.name && (lowerDrugName.includes(this.name.toLowerCase()) || lowerGenericName.includes(this.name.toLowerCase()));
    const isGenericMatch = this.genericName && (lowerDrugName.includes(this.genericName.toLowerCase()) || lowerGenericName.includes(this.genericName.toLowerCase()));

    return isNameMatch || isGenericMatch;
  }

  static fromRow(row) {
    if (!row) return null;
    return new Allergy({
      name: row.name,
      genericName: row.generic_name
    });
  }
}

module.exports = Allergy;
