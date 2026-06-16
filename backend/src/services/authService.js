const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const AppError = require('../utils/AppError')
const User = require('../entities/User')

const OTP_TTL_SECONDS = 10 * 60
const RESET_TOKEN_TTL_SECONDS = 15 * 60
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60

class AuthService {
  #userRepo
  #redis
  #emailTransporter

  constructor(userRepository, redisClient, emailTransporter) {
    this.#userRepo = userRepository
    this.#redis = redisClient
    this.#emailTransporter = emailTransporter
  }

  async register(email, password, fullName) {
    const existingUser = await this.#userRepo.findByEmailIncludingInactive(email)
    if (existingUser?.isVerified()) {
      throw new AppError('Email đã được sử dụng', 409, 'EMAIL_ALREADY_EXISTS')
    }

    const user = existingUser ?? new User({ email })
    user.updateProfile({ fullName })
    user.markPendingVerification()

    await user.changePassword(password, bcrypt)
    await this.#userRepo.save(user)
    await this.#sendOtp(user.email, user.fullName)

    return {
      ...user.getPublicProfile(),
      requiresVerification: true,
    }
  }

  async verifyOtp(email, otp) {
    await this.#assertOtp(email, otp)

    const user = await this.#userRepo.findByEmailIncludingInactive(email)
    if (!user) {
      throw new AppError('Tài khoản không tồn tại', 404, 'USER_NOT_FOUND')
    }

    if (!user.isVerified()) {
      user.activate()
      await this.#userRepo.save(user)
    }

    await this.#redis.del(`otp:${email}`)
    return this.#generateTokens(user)
  }

  async resendOtp(email) {
    const user = await this.#userRepo.findByEmailIncludingInactive(email)
    if (!user) {
      throw new AppError('Email không tồn tại', 404, 'USER_NOT_FOUND')
    }

    if (user.isVerified()) {
      throw new AppError('Tài khoản đã được xác thực', 409, 'ACCOUNT_ALREADY_VERIFIED')
    }

    await this.#sendOtp(user.email, user.fullName)
  }

  async login(email, password) {
    const user = await this.#userRepo.findByEmail(email)
    if (!user) {
      const pendingUser = await this.#userRepo.findByEmailIncludingInactive(email)
      if (pendingUser && !pendingUser.isVerified()) {
        throw new AppError('Tài khoản chưa xác thực OTP', 403, 'ACCOUNT_NOT_VERIFIED')
      }

      throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS')
    }

    const valid = await user.verifyPassword(password, bcrypt)
    if (!valid) {
      throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS')
    }

    return this.#generateTokens(user)
  }

  async forgotPassword(email) {
    const user = await this.#userRepo.findByEmail(email)
    if (!user) return

    const resetToken = crypto.randomBytes(32).toString('hex')
    await this.#redis.setEx(`reset:${resetToken}`, RESET_TOKEN_TTL_SECONDS, user.id)

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

    if (process.env.NODE_ENV === 'development') {
      console.log('\n[DEV] Reset token cho', user.email)
      console.log('[DEV] Token:', resetToken)
      console.log('[DEV] Link:', resetLink, '\n')
      return
    }

    await this.#emailTransporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: '[MedAssist] Đặt lại mật khẩu',
      html: `
        <p>Chào <strong>${user.fullName}</strong>,</p>
        <p>Nhấn vào link bên dưới để đặt lại mật khẩu (hết hạn sau <strong>15 phút</strong>):</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.</p>
      `,
    })
  }

  async resetPassword(token, newPassword) {
    const userId = await this.#redis.get(`reset:${token}`)
    if (!userId) {
      throw new AppError('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn', 400, 'TOKEN_EXPIRED_OR_INVALID')
    }

    const user = await this.#userRepo.findById(userId)
    if (!user) {
      throw new AppError('Tài khoản không tồn tại', 404, 'USER_NOT_FOUND')
    }

    await user.changePassword(newPassword, bcrypt)
    await this.#userRepo.save(user)
    await this.#redis.del(`reset:${token}`)
    await this.#redis.del(`refresh:${userId}`)
  }

  async refreshToken(token) {
    let payload

    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    } catch {
      throw new AppError('Refresh token không hợp lệ hoặc đã hết hạn', 401, 'INVALID_REFRESH_TOKEN')
    }

    const stored = await this.#redis.get(`refresh:${payload.userId}`)
    if (!stored || stored !== token) {
      throw new AppError('Refresh token không hợp lệ hoặc đã hết hạn', 401, 'INVALID_REFRESH_TOKEN')
    }

    const user = await this.#userRepo.findById(payload.userId)
    if (!user) {
      throw new AppError('Tài khoản không tồn tại hoặc đã bị khóa', 401, 'USER_NOT_FOUND')
    }

    return this.#generateTokens(user)
  }

  async logout(token) {
    let payload

    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET, { ignoreExpiration: true })
    } catch {
      return
    }

    await this.#redis.del(`refresh:${payload.userId}`)
  }

  async #assertOtp(email, otp) {
    const stored = await this.#redis.get(`otp:${email}`)
    if (!stored || stored !== otp) {
      throw new AppError('Mã OTP không đúng hoặc đã hết hạn', 400, 'INVALID_OTP')
    }
  }

  async #sendOtp(email, fullName) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    await this.#redis.setEx(`otp:${email}`, OTP_TTL_SECONDS, otp)

    if (process.env.NODE_ENV === 'development') {
      console.log('\n[DEV] OTP cho:', email)
      console.log('[DEV] Mã OTP:', otp, '\n')
      return
    }

    await this.#emailTransporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '[MedAssist] Mã xác thực tài khoản',
      html: `
        <p>Chào <strong>${fullName}</strong>,</p>
        <p>Mã xác thực của bạn là: <strong style="font-size:24px">${otp}</strong></p>
        <p>Mã có hiệu lực trong <strong>10 phút</strong>.</p>
      `,
    })
  }

  async #generateTokens(user) {
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    )

    await this.#redis.setEx(`refresh:${user.id}`, REFRESH_TOKEN_TTL_SECONDS, refreshToken)

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    }
  }
}

module.exports = AuthService
