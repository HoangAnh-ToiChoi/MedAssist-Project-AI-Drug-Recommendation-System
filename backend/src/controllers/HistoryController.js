const ApiResponse = require('../utils/ApiResponse')

class HistoryController {
  #historyService

  constructor(historyService) {
    this.#historyService = historyService
  }

  async getAll(req, res, next) {
    try {
      const result = await this.#historyService.getHistory(req.user.id)
      res.json(ApiResponse.success(result))
    } catch (err) {
      next(err)
    }
  }

  async create(req, res, next) {
    try {
      const result = await this.#historyService.createHistory(req.user.id, req.body)
      res.status(201).json(ApiResponse.success(result, 'Thêm tiền sử bệnh thành công'))
    } catch (err) {
      next(err)
    }
  }

  async update(req, res, next) {
    try {
      const result = await this.#historyService.updateHistory(req.user.id, req.params.id, req.body)
      res.json(ApiResponse.success(result, 'Cập nhật tiền sử bệnh thành công'))
    } catch (err) {
      next(err)
    }
  }

  async remove(req, res, next) {
    try {
      await this.#historyService.deleteHistory(req.user.id, req.params.id)
      res.json(ApiResponse.success(null, 'Xóa tiền sử bệnh thành công'))
    } catch (err) {
      next(err)
    }
  }
}

module.exports = HistoryController
