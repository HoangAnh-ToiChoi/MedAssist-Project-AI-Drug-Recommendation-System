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

  searchDrugs = async (req, res, next) => {
    try {
      const { q } = req.query
      const data = await this.#allergyService.searchDrugs(q)
      res.json(ApiResponse.success(data))
    } catch (err) {
      next(err)
    }
  }

  updateAllergy = async (req, res, next) => {
    try {
      const { id } = req.params
      const data = await this.#allergyService.updateAllergy(id, req.user.id, req.body)
      res.json(ApiResponse.success(data, 'Cập nhật dị ứng thành công'))
    } catch (err) {
      next(err)
    }
  }

  deleteAllergy = async (req, res, next) => {
    try {
      const { id } = req.params
      await this.#allergyService.deleteAllergy(req.user.id, id)
      res.json(ApiResponse.success(null, 'Xóa dị ứng thành công'))
    } catch (err) {
      next(err)
    }
  }
}

module.exports = AllergyController
