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
      'SELECT id, email, full_name, date_of_birth, gender, phone_number, role, is_active, created_at, updated_at FROM users WHERE id = $1 AND is_active = true',
      [userId]
    )
  }

  async updateProfile(id, profileData) {
    const updates = []
    const values = [id]

    if (profileData.fullName !== undefined) {
      values.push(profileData.fullName)
      updates.push(`full_name = $${values.length}`)
    }
    if (profileData.dateOfBirth !== undefined) {
      values.push(profileData.dateOfBirth)
      updates.push(`date_of_birth = $${values.length}`)
    }
    if (profileData.gender !== undefined) {
      const dbGender = profileData.gender ? profileData.gender.toLowerCase() : null
      values.push(dbGender)
      updates.push(`gender = $${values.length}`)
    }
    if (profileData.phoneNumber !== undefined) {
      values.push(profileData.phoneNumber)
      updates.push(`phone_number = $${values.length}`)
    }

    if (!updates.length) {
      return this.findById(id)
    }

    const { rows } = await this.#pool.query(
      `UPDATE users
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND is_active = true
       RETURNING id, email, full_name, date_of_birth, gender, phone_number, role, is_active, created_at, updated_at`,
      values
    )

    return User.fromRow(rows[0])
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
