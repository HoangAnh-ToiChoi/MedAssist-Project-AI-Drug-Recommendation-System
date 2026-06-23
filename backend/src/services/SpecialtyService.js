class SpecialtyService {
  #diseaseGraphRepository

  constructor(diseaseGraphRepository) {
    this.#diseaseGraphRepository = diseaseGraphRepository
  }

  async getAllSpecialties() {
    return this.#diseaseGraphRepository.findSpecialties()
  }

  async getSymptomsBySpecialty(specialtyCode) {
    return this.#diseaseGraphRepository.findSymptomsBySpecialtyCode(specialtyCode)
  }

  async getDiseasesBySpecialty(specialtyCode) {
    return this.#diseaseGraphRepository.findDiseasesBySpecialtyCode(specialtyCode)
  }
}

module.exports = SpecialtyService
