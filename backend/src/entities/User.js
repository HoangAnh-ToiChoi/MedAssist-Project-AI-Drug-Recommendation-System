class User {
  constructor({ id, email, passwordHash, fullName, role, isActive, createdAt, updatedAt }) {
    this.id = id
    this.email = email
    this.passwordHash = passwordHash
    this.fullName = fullName
    this.role = role || 'user'
    this.isActive = isActive !== undefined ? isActive : true
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  isNew() {
    return !this.id
  }

  isVerified() {
    return this.isActive
  }

  activate() {
    this.isActive = true
  }

  markPendingVerification() {
    this.isActive = false
  }

  updateProfile({ fullName }) {
    this.fullName = fullName
  }

  async verifyPassword(plainPassword, bcrypt) {
    if (!this.passwordHash) return false
    return bcrypt.compare(plainPassword, this.passwordHash)
  }

  async changePassword(newPlainPassword, bcrypt) {
    this.passwordHash = await bcrypt.hash(newPlainPassword, 10)
  }

  getPublicProfile() {
    return {
      id: this.id,
      email: this.email,
      fullName: this.fullName,
      role: this.role,
      createdAt: this.createdAt,
    }
  }

  static fromRow(row) {
    if (!row) return null

    return new User({
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      fullName: row.full_name,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  }
}

module.exports = User
