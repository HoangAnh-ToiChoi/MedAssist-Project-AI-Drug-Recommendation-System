const ApiResponse = require('../utils/ApiResponse')

class AdminController {
  #adminService

  constructor(adminService) {
    this.#adminService = adminService
  }

  async getUsers(req, res, next) {
    try {
      const users = await this.#adminService.getAllUsers()
      res.status(200).json(ApiResponse.success(users, 'Lấy danh sách người dùng thành công'))
    } catch (err) {
      next(err)
    }
  }
}

module.exports = AdminController
