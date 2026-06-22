const ApiResponse = require('../utils/ApiResponse')

class SpecialtyController {
  #specialtyService

  constructor(specialtyService) {
    this.#specialtyService = specialtyService
  }

  async getAll(req, res, next) {
    try {
      const result = await this.#specialtyService.getAllSpecialties()
      res.json(ApiResponse.success(result))
    } catch (err) {
      next(err)
    }
  }

  async getSymptoms(req, res, next) {
    try {
      const result = await this.#specialtyService.getSymptomsBySpecialty(req.params.specialtyCode)
      res.json(ApiResponse.success(result))
    } catch (err) {
      next(err)
    }
  }

  async getDiseases(req, res, next) {
    try {
      const result = await this.#specialtyService.getDiseasesBySpecialty(req.params.specialtyCode)
      res.json(ApiResponse.success(result))
    } catch (err) {
      next(err)
    }
  }
}

module.exports = SpecialtyController
