const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const AppError = require('../utils/AppError')
const User = require('../entities/User')

const OTP_TTL_SECONDS = 10 * 60
const OTP_MAX_ATTEMPTS = 3
const RESET_TOKEN_TTL_SECONDS = 15 * 60
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60
const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_LOCK_TTL_SECONDS = 15 * 60

class AuthService {
  #userRepo
  #refreshTokenRepo
  #redis
  #emailTransporter

  constructor(userRepository, refreshTokenRepository, redisClient, emailTransporter) {
    this.#userRepo = userRepository
    this.#refreshTokenRepo = refreshTokenRepository
    this.#redis = redisClient
    this.#emailTransporter = emailTransporter
  }

  async register(email, password, fullName) {
    const normalizedEmail = this.#normalizeEmail(email)
    const existingUser = await this.#userRepo.findByEmailIncludingInactive(normalizedEmail)
    if (existingUser?.isVerified()) {
      throw new AppError('Email đã được sử dụng', 409, 'EMAIL_ALREADY_EXISTS')
    }

    const user = existingUser ?? new User({ email: normalizedEmail })
    user.email = normalizedEmail
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
    const normalizedEmail = this.#normalizeEmail(email)
    await this.#assertOtp(normalizedEmail, otp)

    const user = await this.#userRepo.findByEmailIncludingInactive(normalizedEmail)
    if (!user) {
      throw new AppError('Tài khoản không tồn tại', 404, 'USER_NOT_FOUND')
    }

    if (!user.isVerified()) {
      user.activate()
      await this.#userRepo.save(user)
    }

    await this.#redis.del(`otp:${normalizedEmail}`)
    await this.#redis.del(`otp:attempts:${normalizedEmail}`)
    return this.#generateTokens(user)
  }

  async resendOtp(email) {
    const normalizedEmail = this.#normalizeEmail(email)
    const user = await this.#userRepo.findByEmailIncludingInactive(normalizedEmail)
    if (!user) {
      throw new AppError('Email không tồn tại', 404, 'USER_NOT_FOUND')
    }

    if (user.isVerified()) {
      throw new AppError('Tài khoản đã được xác thực', 409, 'ACCOUNT_ALREADY_VERIFIED')
    }

    await this.#sendOtp(user.email, user.fullName)
  }

  async login(email, password) {
    const normalizedEmail = this.#normalizeEmail(email)
    await this.#assertLoginNotLocked(normalizedEmail)

    const user = await this.#userRepo.findByEmail(normalizedEmail)
    if (!user) {
      const pendingUser = await this.#userRepo.findByEmailIncludingInactive(normalizedEmail)
      if (pendingUser && !pendingUser.isVerified()) {
        throw new AppError('Tài khoản chưa xác thực OTP', 403, 'ACCOUNT_NOT_VERIFIED')
      }

      await this.#handleFailedLogin(normalizedEmail)
    }

    const valid = await user.verifyPassword(password, bcrypt)
    if (!valid) {
      await this.#handleFailedLogin(normalizedEmail)
    }

    await this.#clearFailedLoginState(normalizedEmail)
    return this.#generateTokens(user)
  }

  async forgotPassword(email) {
    const normalizedEmail = this.#normalizeEmail(email)
    const user = await this.#userRepo.findByEmail(normalizedEmail)
    if (!user) return

    const resetToken = crypto.randomBytes(32).toString('hex')
    await this.#redis.setEx(`reset:${resetToken}`, RESET_TOKEN_TTL_SECONDS, user.id)

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

    if (process.env.NODE_ENV === 'development') {
      const logger = require('../utils/logger')
      logger.info(`[DEV] Reset token cho ${user.email} - Token: ${resetToken} - Link: ${resetLink}`)
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
    await this.#refreshTokenRepo.revokeAllByUserId(user.id)
  }

  async refreshToken(token) {
    const payload = this.#verifyRefreshToken(token)
    const tokenHash = this.#hashToken(token)
    const stored = await this.#refreshTokenRepo.findActiveByTokenHash(tokenHash)

    if (!stored || stored.user_id !== payload.userId) {
      throw new AppError('Refresh token không hợp lệ hoặc đã hết hạn', 401, 'INVALID_REFRESH_TOKEN')
    }

    const user = await this.#userRepo.findById(payload.userId)
    if (!user) {
      throw new AppError('Tài khoản không tồn tại hoặc đã bị khóa', 401, 'USER_NOT_FOUND')
    }

    await this.#refreshTokenRepo.revokeByTokenHash(tokenHash)
    return this.#generateTokens(user)
  }

  async logout(token) {
    try {
      this.#verifyRefreshToken(token, { ignoreExpiration: true })
    } catch {
      return
    }

    await this.#refreshTokenRepo.revokeByTokenHash(this.#hashToken(token))
  }

  async #assertOtp(email, otp) {
    const stored = await this.#redis.get(`otp:${email}`)
    if (stored && stored === otp) {
      return
    }

    const key = `otp:attempts:${email}`
    const attempts = Number(await this.#redis.get(key) || 0) + 1
    await this.#redis.setEx(key, OTP_TTL_SECONDS, String(attempts))

    if (attempts >= OTP_MAX_ATTEMPTS) {
      await this.#redis.del(`otp:${email}`)
      throw new AppError(
        'Bạn đã nhập sai OTP quá số lần cho phép. Vui lòng yêu cầu mã mới.',
        429,
        'OTP_ATTEMPTS_EXCEEDED',
      )
    }

    throw new AppError('Mã OTP không đúng hoặc đã hết hạn', 400, 'INVALID_OTP')
  }

  async #sendOtp(email, fullName) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    await this.#redis.setEx(`otp:${email}`, OTP_TTL_SECONDS, otp)
    await this.#redis.del(`otp:attempts:${email}`)

    if (process.env.NODE_ENV === 'development') {
      const logger = require('../utils/logger')
      logger.info(`[DEV] OTP cho: ${email} - Mã OTP: ${otp}`)
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
      {
        userId: user.id,
        role: user.role,
        type: 'access',
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh',
        tokenId: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    )

    await this.#refreshTokenRepo.save({
      userId: user.id,
      tokenHash: this.#hashToken(refreshToken),
      expiresAt: this.#getRefreshTokenExpiresAt(),
    })

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

  #verifyRefreshToken(token, options = {}) {
    let payload

    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET, options)
    } catch {
      throw new AppError('Refresh token không hợp lệ hoặc đã hết hạn', 401, 'INVALID_REFRESH_TOKEN')
    }

    if (payload.type !== 'refresh' || !payload.userId) {
      throw new AppError('Refresh token không hợp lệ hoặc đã hết hạn', 401, 'INVALID_REFRESH_TOKEN')
    }

    return payload
  }

  #hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex')
  }

  #getRefreshTokenExpiresAt() {
    return new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)
  }

  #normalizeEmail(email) {
    return String(email || '').trim().toLowerCase()
  }

  async #assertLoginNotLocked(email) {
    const locked = await this.#redis.get(`login:lock:${email}`)
    if (locked) {
      throw new AppError(
        'Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút.',
        423,
        'ACCOUNT_TEMPORARILY_LOCKED',
      )
    }
  }

  async #handleFailedLogin(email) {
    const attemptsKey = `login:attempts:${email}`
    const attempts = Number(await this.#redis.get(attemptsKey) || 0) + 1

    if (attempts >= LOGIN_MAX_ATTEMPTS) {
      await this.#redis.setEx(`login:lock:${email}`, LOGIN_LOCK_TTL_SECONDS, '1')
      await this.#redis.del(attemptsKey)
      throw new AppError(
        'Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút.',
        423,
        'ACCOUNT_TEMPORARILY_LOCKED',
      )
    }

    await this.#redis.setEx(attemptsKey, LOGIN_LOCK_TTL_SECONDS, String(attempts))
    throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS')
  }

  async #clearFailedLoginState(email) {
    await this.#redis.del(`login:attempts:${email}`)
    await this.#redis.del(`login:lock:${email}`)
  }
}

module.exports = AuthService
