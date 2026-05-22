const ApiResponse = require('../utils/ApiResponse')

class SymptomController {
  #symptomService

  constructor(symptomService) {
    this.#symptomService = symptomService
  }

  getAll = async (req, res, next) => {
    try {
      const result = await this.#symptomService.getSymptomsForSelection()
      res.json(ApiResponse.success(result))
    } catch (err) {
      next(err)
    }
  }
}

module.exports = SymptomController
