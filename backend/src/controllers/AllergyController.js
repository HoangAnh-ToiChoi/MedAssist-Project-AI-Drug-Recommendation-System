const ApiResponse = require('../utils/ApiResponse')

class AllergyController {
  #allergyService

  constructor(allergyService) {
    this.#allergyService = allergyService
  }

  getAllergies = async (req, res, next) => {
    try {
      const data = await this.#allergyService.getAllergies(req.user.id)
      res.json(ApiResponse.success(data))
    } catch (err) {
      next(err)
    }
  }

  addAllergy = async (req, res, next) => {
    try {
      const data = await this.#allergyService.addAllergy(req.user.id, req.body)
      res.status(201).json(ApiResponse.success(data, 'Thêm dị ứng thành công', 201))
    } catch (err) {
      next(err)
    }
  }
}

module.exports = AllergyController
