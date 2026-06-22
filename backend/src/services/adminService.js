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
}

module.exports = AdminService
