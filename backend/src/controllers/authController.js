const ApiResponse = require('../utils/ApiResponse')

class AuthController {
  #authService

  constructor(authService) {
    this.#authService = authService
  }

  async register(req, res, next) {
    try {
      const { email, password, fullName } = req.body
      const user = await this.#authService.register(email, password, fullName)
      res.status(201).json(ApiResponse.success(user, 'Đăng ký thành công'))
    } catch (err) {
      next(err)
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body
      const result = await this.#authService.login(email, password)
      res.json(ApiResponse.success(result, 'Đăng nhập thành công'))
    } catch (err) {
      next(err)
    }
  }

  async forgotPassword(req, res, next) {
    try {
      // CHCKNSPC-110: Service luôn trả về { message } dù email có tồn tại hay không
      // Controller chỉ việc render HTTP 200 với message đó — không bao giờ leak 404
      const { message } = await this.#authService.forgotPassword(req.body.email)
      res.json(ApiResponse.success(null, message))
    } catch (err) {
      next(err)
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body
      await this.#authService.resetPassword(token, newPassword)
      res.json(ApiResponse.success(null, 'Đặt lại mật khẩu thành công'))
    } catch (err) {
      next(err)
    }
  }

  async refresh(req, res, next) {
    try {
      const result = await this.#authService.refreshToken(req.body.refreshToken)
      res.json(ApiResponse.success(result, 'Làm mới token thành công'))
    } catch (err) {
      next(err)
    }
  }

  async verifyOtp(req, res, next) {
    try {
      const { email, otp } = req.body
      const result = await this.#authService.verifyOtp(email, otp)
      res.json(ApiResponse.success(result, 'Xác thực thành công'))
    } catch (err) {
      next(err)
    }
  }

  async resendOtp(req, res, next) {
    try {
      await this.#authService.resendOtp(req.body.email)
      res.json(ApiResponse.success(null, 'Đã gửi lại mã OTP'))
    } catch (err) {
      next(err)
    }
  }

  async logout(req, res, next) {
    try {
      await this.#authService.logout(req.body.refreshToken)
      res.json(ApiResponse.success(null, 'Đăng xuất thành công'))
    } catch (err) {
      next(err)
    }
  }
}

module.exports = AuthController
