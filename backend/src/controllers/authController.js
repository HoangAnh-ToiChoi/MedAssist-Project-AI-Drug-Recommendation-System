const ApiResponse = require('../utils/ApiResponse')

class AuthController {
  #authService

  constructor(authService) {
    this.#authService = authService
  }

  register = async (req, res, next) => {
    try {
      const { email, password, fullName } = req.body
      const user = await this.#authService.register(email, password, fullName)
      res.status(201).json(ApiResponse.success(user, 'Đăng ký thành công'))
    } catch (err) {
      next(err)
    }
  }

  login = async (req, res, next) => {
    try {
      const { email, password } = req.body
      const result = await this.#authService.login(email, password)
      res.json(ApiResponse.success(result, 'Đăng nhập thành công'))
    } catch (err) {
      next(err)
    }
  }

  forgotPassword = async (req, res, next) => {
    try {
      await this.#authService.forgotPassword(req.body.email)
      res.json(ApiResponse.success(null, 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu'))
    } catch (err) {
      next(err)
    }
  }

  resetPassword = async (req, res, next) => {
    try {
      const { token, newPassword } = req.body
      await this.#authService.resetPassword(token, newPassword)
      res.json(ApiResponse.success(null, 'Đặt lại mật khẩu thành công'))
    } catch (err) {
      next(err)
    }
  }
}

module.exports = AuthController
