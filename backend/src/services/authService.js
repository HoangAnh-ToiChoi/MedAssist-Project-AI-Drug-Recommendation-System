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

  /**
   * CHCKNSPC-110 — Anti User Enumeration (OWASP V2.7)
   *
   * Mọi trường hợp email/password sai đều trả về CÙNG message "Email hoặc mật khẩu không đúng"
   * thông qua #handleFailedLogin(), bao gồm:
   *   - Email không tồn tại (active)
   *   - Email tồn tại nhưng chưa xác thực OTP (không tiết lộ trạng thái tài khoản)
   *   - Mật khẩu sai
   */
  async login(email, password) {
    const normalizedEmail = this.#normalizeEmail(email)
    await this.#assertLoginNotLocked(normalizedEmail)

    const user = await this.#userRepo.findByEmail(normalizedEmail)
    if (!user) {
      // OWASP V2.7: Không phân biệt "email không tồn tại" vs "chưa xác thực OTP"
      // Cả hai trường hợp đều bị xử lý như thông tin xác thực sai → 401 generic
      await this.#handleFailedLogin(normalizedEmail)
    }

    const valid = await user.verifyPassword(password, bcrypt)
    if (!valid) {
      await this.#handleFailedLogin(normalizedEmail)
    }

    await this.#clearFailedLoginState(normalizedEmail)
    return this.#generateTokens(user)
  }

  /**
   * CHCKNSPC-110 — Anti User Enumeration cho Forgot Password (OWASP V2.7)
   *
   * Dù email CÓ hay KHÔNG tồn tại trong hệ thống, luôn trả về cùng message thành công.
   * Điều này ngăn hacker dùng endpoint này để dò tìm email đã đăng ký.
   *
   * @returns {{ message: string }} Message chung chung để controller render HTTP 200.
   */
  async forgotPassword(email) {
    const GENERIC_MESSAGE = 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đi.'

    const normalizedEmail = this.#normalizeEmail(email)
    const user = await this.#userRepo.findByEmail(normalizedEmail)

    // Email không tồn tại → im lặng, trả về message chung (KHÔNG throw 404)
    if (!user) return { message: GENERIC_MESSAGE }

    const resetToken = crypto.randomBytes(32).toString('hex')
    await this.#redis.setEx(`reset:${resetToken}`, RESET_TOKEN_TTL_SECONDS, user.id)

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

    if (process.env.NODE_ENV === 'development') {
      const logger = require('../utils/logger')
      logger.info(`[DEV] Reset token cho ${user.email} - Token: ${resetToken} - Link: ${resetLink}`)
      return { message: GENERIC_MESSAGE }
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

    return { message: GENERIC_MESSAGE }
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

    // Thu hồi tất cả refresh token: xóa cả DB record lẫn Redis key
    // Redis key phải bị xóa để vô hiệu hóa ngay lập tức mọi phiên đang active
    await this.#refreshTokenRepo.revokeAllByUserId(user.id)
    await this.#redis.del(`refresh:${user.id}`)
  }


  /**
   * CHCKNSPC-109 — Refresh Token Rotation (Redis-based)
   *
   * Flow:
   *   1. Verify chữ ký JWT bằng JWT_REFRESH_SECRET.
   *   2. Lấy userId từ payload.
   *   3. Đọc Redis key `refresh:{userId}` → so sánh với token gửi lên.
   *   4. Nếu khớp → tạo cặp token mới → setEx key mới vào Redis (rotation) → trả về.
   *   5. Nếu không khớp → 401 (có thể là token reuse attack).
   *
   * @param {string} token - Refresh token từ request body.
   * @returns {{ accessToken, refreshToken, user }} Cặp token mới.
   */
  async refreshToken(token) {
    const payload = this.#verifyRefreshToken(token)
    const { userId } = payload
    const redisKey = `refresh:${userId}`

    let storedToken
    try {
      storedToken = await this.#redis.get(redisKey)
    } catch (redisErr) {
      const logger = require('../utils/logger')
      logger.error(`[AuthService] Redis error khi đọc refresh token (userId=${userId}): ${redisErr.message}`)
      throw new AppError('Lỗi hệ thống, vui lòng thử lại', 503, 'SERVICE_UNAVAILABLE')
    }

    // Không tìm thấy hoặc token không khớp → có thể là token reuse / đã logout
    if (!storedToken || storedToken !== token) {
      throw new AppError('Refresh token không hợp lệ hoặc đã hết hạn', 401, 'INVALID_REFRESH_TOKEN')
    }

    const user = await this.#userRepo.findById(userId)
    if (!user) {
      throw new AppError('Tài khoản không tồn tại hoặc đã bị khóa', 401, 'USER_NOT_FOUND')
    }

    // Tạo cặp token mới; #generateTokens sẽ tự setEx key mới vào Redis (rotation)
    return this.#generateTokens(user)
  }

  /**
   * CHCKNSPC-109 — Logout / Thu hồi Refresh Token (Redis-based)
   *
   * Dùng ignoreExpiration:true để cho phép logout kể cả khi token vừa hết hạn.
   * Nếu JWT signature sai hoàn toàn → trả về luôn (không throw, UX ưu tiên).
   *
   * @param {string} token - Refresh token từ request body.
   */
  async logout(token) {
    let payload
    try {
      payload = this.#verifyRefreshToken(token, { ignoreExpiration: true })
    } catch {
      // Token sai chữ ký hoàn toàn — không có gì để xóa, coi như logout thành công
      return
    }

    const { userId } = payload
    try {
      await this.#redis.del(`refresh:${userId}`)
    } catch (redisErr) {
      const logger = require('../utils/logger')
      logger.error(`[AuthService] Redis error khi xóa refresh token (userId=${userId}): ${redisErr.message}`)
      // Không throw — logout vẫn được coi là thành công về phía client
    }
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

  /**
   * Tạo cặp Access / Refresh token và lưu trữ song song vào:
   *   - Redis  : key `refresh:{userId}` (cho Token Rotation & Logout nhanh)
   *   - DB     : bảng refresh_tokens (cho resetPassword → revokeAllByUserId)
   *
   * Redis setEx dùng cùng TTL với JWT_REFRESH_EXPIRES_IN (7d).
   * Nếu Redis lỗi → chỉ log warn, KHÔNG block flow (DB vẫn là nguồn chân lý).
   */
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

    // Lưu vào DB (dùng cho resetPassword → revokeAllByUserId)
    await this.#refreshTokenRepo.save({
      userId: user.id,
      tokenHash: this.#hashToken(refreshToken),
      expiresAt: this.#getRefreshTokenExpiresAt(),
    })

    // Lưu raw token vào Redis (dùng cho Token Rotation & Logout)
    // Ghi đè key cũ → đảm bảo chỉ 1 refresh token hợp lệ tại một thời điểm
    try {
      await this.#redis.setEx(`refresh:${user.id}`, REFRESH_TOKEN_TTL_SECONDS, refreshToken)
    } catch (redisErr) {
      const logger = require('../utils/logger')
      logger.warn(`[AuthService] Redis setEx thất bại khi lưu refresh token (userId=${user.id}): ${redisErr.message}`)
    }

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
