const AppError = require('../utils/AppError')

class AdminService {
  #userRepo

  constructor(userRepository) {
    this.#userRepo = userRepository
  }

  async getAllUsers() {
    const users = await this.#userRepo.findAllUsers()
    return users.map(user => user.getPublicProfile())
  }

  async updateUserStatus(adminId, targetUserId, isActive) {
    if (adminId === targetUserId) {
      throw new AppError('Không thể tự thay đổi trạng thái hoạt động của chính mình', 400, 'SELF_STATUS_UPDATE_BLOCKED')
    }

    const user = await this.#userRepo.findByIdIncludingInactive(targetUserId)
    if (!user) {
      throw new AppError('Người dùng không tồn tại', 404, 'USER_NOT_FOUND')
    }

    const updated = await this.#userRepo.updateStatus(targetUserId, isActive)
    return updated
  }
}

module.exports = AdminService
