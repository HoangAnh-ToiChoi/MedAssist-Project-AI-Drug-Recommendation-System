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

  async updateUserStatus(req, res, next) {
    try {
      const adminId = req.user.id
      const targetUserId = req.params.id
      const { isActive } = req.body

      const result = await this.#adminService.updateUserStatus(adminId, targetUserId, isActive)
      res.status(200).json(ApiResponse.success(result, 'Cập nhật trạng thái người dùng thành công'))
    } catch (err) {
      next(err)
    }
  }
}

module.exports = AdminController
