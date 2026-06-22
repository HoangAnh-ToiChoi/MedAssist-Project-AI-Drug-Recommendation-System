const ApiResponse = require('../utils/ApiResponse')

class ProfileController {
  #profileService

  constructor(profileService) {
    this.#profileService = profileService
  }

  async getProfile(req, res, next) {
    try {
      const userId = req.user.id
      const profile = await this.#profileService.getProfile(userId)
      res.status(200).json(ApiResponse.success(profile))
    } catch (err) {
      next(err)
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id
      const profile = await this.#profileService.updateProfile(userId, req.body)
      res.status(200).json(ApiResponse.success(profile, 'Cập nhật thông tin cá nhân thành công'))
    } catch (err) {
      next(err)
    }
  }
}

module.exports = ProfileController
