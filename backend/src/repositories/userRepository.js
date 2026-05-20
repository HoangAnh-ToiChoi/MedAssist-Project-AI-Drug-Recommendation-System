class UserRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async findByEmail(email) {
    const { rows } = await this.#pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    )
    return rows[0] || null
  }

  async createUser({ email, passwordHash, fullName }) {
    const { rows } = await this.#pool.query(
      `INSERT INTO users (id, email, password_hash, full_name)
       VALUES (gen_random_uuid(), $1, $2, $3)
       RETURNING id, email, full_name, created_at`,
      [email, passwordHash, fullName]
    )
    return rows[0]
  }

  async findById(userId) {
    const { rows } = await this.#pool.query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [userId]
    )
    return rows[0] || null
  }

  async updatePassword(userId, passwordHash) {
    await this.#pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    )
  }
}

module.exports = UserRepository
