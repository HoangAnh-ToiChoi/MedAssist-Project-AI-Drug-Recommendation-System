class Recommendation {
  constructor({ id, userId, inputSymptoms, outputDrugs, aiVersion, dangerAlert, createdAt }) {
    this.id = id;
    this.userId = userId;
    this.inputSymptoms = inputSymptoms;
    this.outputDrugs = outputDrugs;
    this.aiVersion = aiVersion;
    this.dangerAlert = dangerAlert;
    this.createdAt = createdAt;
  }

  isNew() {
    return !this.id;
  }

  static fromRow(row) {
    if (!row) return null;
    return new Recommendation({
      id: row.id,
      userId: row.user_id,
      inputSymptoms: typeof row.input_symptoms === 'string' ? JSON.parse(row.input_symptoms) : row.input_symptoms,
      outputDrugs: typeof row.output_drugs === 'string' ? JSON.parse(row.output_drugs) : row.output_drugs,
      aiVersion: row.ai_version,
      dangerAlert: row.danger_alert,
      createdAt: row.created_at,
    });
  }
}

module.exports = Recommendation;
