const User = require('../entities/User')

class UserRepository {
  #pool

  constructor(pool) {
    this.#pool = pool
  }

  async #findOneBy(query, params) {
    const { rows } = await this.#pool.query(query, params)
    return User.fromRow(rows[0])
  }

  async findByEmail(email) {
    return this.#findOneBy(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    )
  }

  async findByEmailIncludingInactive(email) {
    return this.#findOneBy(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )
  }

  async findById(userId) {
    return this.#findOneBy(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [userId]
    )
  }

  async save(user) {
    if (user.isNew()) {
      const { rows } = await this.#pool.query(
        `INSERT INTO users (id, email, password_hash, full_name, is_active)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         RETURNING id, email, full_name, role, is_active, created_at, updated_at`,
        [user.email, user.passwordHash, user.fullName, user.isActive]
      )

      const insertedRow = rows[0]
      user.id = insertedRow.id
      user.createdAt = insertedRow.created_at
      user.updatedAt = insertedRow.updated_at
      user.role = insertedRow.role
      user.isActive = insertedRow.is_active
      return user
    }

    await this.#pool.query(
      'UPDATE users SET password_hash = $1, full_name = $2, role = $3, is_active = $4, updated_at = NOW() WHERE id = $5',
      [user.passwordHash, user.fullName, user.role, user.isActive, user.id]
    )

    return user
  }
}

module.exports = UserRepository
