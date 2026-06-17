class RefreshTokenRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async save({ userId, tokenHash, expiresAt }) {
    await this.#pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, revoked)
       VALUES ($1, $2, $3, false)`,
      [userId, tokenHash, expiresAt]
    )
  }

  async findActiveByTokenHash(tokenHash) {
    const { rows } = await this.#pool.query(
      `SELECT id, user_id, token_hash, expires_at, revoked, created_at
       FROM refresh_tokens
       WHERE token_hash = $1
         AND revoked = false
         AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    )

    return rows[0] || null
  }

  async revokeByTokenHash(tokenHash) {
    const { rowCount } = await this.#pool.query(
      `UPDATE refresh_tokens
       SET revoked = true
       WHERE token_hash = $1
         AND revoked = false`,
      [tokenHash]
    )

    return rowCount > 0
  }

  async revokeAllByUserId(userId) {
    await this.#pool.query(
      `UPDATE refresh_tokens
       SET revoked = true
       WHERE user_id = $1
         AND revoked = false`,
      [userId]
    )
  }
}

module.exports = RefreshTokenRepository
