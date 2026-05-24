const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const AppError = require('../utils/AppError')

class AuthService {
  #userRepo
  #redis
  #emailTransporter

  constructor(userRepository, redisClient, emailTransporter) {
    this.#userRepo          = userRepository
    this.#redis             = redisClient
    this.#emailTransporter  = emailTransporter
  }

  async register(email, password, fullName) {
    const existing = await this.#userRepo.findByEmail(email)
    if (existing) {
      throw new AppError('Email đã được sử dụng', 409, 'EMAIL_ALREADY_EXISTS')
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await this.#userRepo.createUser({ email, passwordHash, fullName })

    await this.#sendOtp(email, user.full_name)

    return {
      id:        user.id,
      email:     user.email,
      fullName:  user.full_name,
      createdAt: user.created_at,
    }
  }

  async verifyOtp(email, otp) {
    const stored = await this.#redis.get(`otp:${email}`)
    if (!stored || stored !== otp) {
      throw new AppError('Mã OTP không đúng hoặc đã hết hạn', 400, 'INVALID_OTP')
    }

    await this.#redis.del(`otp:${email}`)

    const user = await this.#userRepo.findByEmail(email)
    if (!user) throw new AppError('Tài khoản không tồn tại', 404, 'USER_NOT_FOUND')

    return this.#generateTokens(user)
  }

  async resendOtp(email) {
    const user = await this.#userRepo.findByEmail(email)
    if (!user) throw new AppError('Email không tồn tại', 404, 'USER_NOT_FOUND')

    await this.#sendOtp(email, user.full_name)
  }

  async #sendOtp(email, fullName) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    await this.#redis.setEx(`otp:${email}`, 10 * 60, otp)

    if (process.env.NODE_ENV === 'development') {
      console.log('\n[DEV] ─────────────────────────────')
      console.log('[DEV] OTP cho:', email)
      console.log('[DEV] Mã OTP: ', otp)
      console.log('[DEV] ─────────────────────────────\n')
      return
    }

    await this.#emailTransporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to:      email,
      subject: '[MedAssist] Mã xác thực tài khoản',
      html: `
        <p>Chào <strong>${fullName}</strong>,</p>
        <p>Mã xác thực của bạn là: <strong style="font-size:24px">${otp}</strong></p>
        <p>Mã có hiệu lực trong <strong>10 phút</strong>.</p>
      `,
    })
  }

  async login(email, password) {
    const user = await this.#userRepo.findByEmail(email)
    if (!user) {
      throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS')
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS')
    }

    return this.#generateTokens(user)
  }

  async forgotPassword(email) {
    const user = await this.#userRepo.findByEmail(email)

    // Luôn trả về thành công dù email có tồn tại hay không — chống user enumeration
    if (!user) return

    const resetToken = crypto.randomBytes(32).toString('hex')
    await this.#redis.setEx(`reset:${resetToken}`, 15 * 60, user.id)

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

    // Dev mode: log token ra console thay vì gửi email thật
    if (process.env.NODE_ENV === 'development') {
      console.log('\n[DEV] Reset token cho', user.email)
      console.log('[DEV] Token:', resetToken)
      console.log('[DEV] Link:', resetLink, '\n')
      return
    }

    await this.#emailTransporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to:      user.email,
      subject: '[MedAssist] Đặt lại mật khẩu',
      html: `
        <p>Chào <strong>${user.full_name}</strong>,</p>
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

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await this.#userRepo.updatePassword(userId, passwordHash)

    // Invalidate reset token và refresh token cũ
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

    await this.#redis.setEx(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken)

    return {
      accessToken,
      refreshToken,
      user: {
        id:       user.id,
        email:    user.email,
        fullName: user.full_name,
        role:     user.role,
      },
    }
  }
}

module.exports = AuthService
