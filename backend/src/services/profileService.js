const AppError = require('../utils/AppError')

class ProfileService {
  #userRepo

  constructor(userRepository) {
    this.#userRepo = userRepository
  }

  async getProfile(userId) {
    const user = await this.#userRepo.findById(userId)
    if (!user) {
      throw new AppError('Tài khoản không tồn tại', 404, 'USER_NOT_FOUND')
    }
    return user.getPublicProfile()
  }

  async updateProfile(userId, profileData) {
    const user = await this.#userRepo.findById(userId)
    if (!user) {
      throw new AppError('Tài khoản không tồn tại', 404, 'USER_NOT_FOUND')
    }
    const updatedUser = await this.#userRepo.updateProfile(userId, profileData)
    return updatedUser.getPublicProfile()
  }
}

module.exports = ProfileService
