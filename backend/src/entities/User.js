class User {
  constructor({ id, email, passwordHash, fullName, role, isActive, createdAt, updatedAt, dateOfBirth, gender, phoneNumber, googleId, facebookId, appleId }) {
    this.id = id
    this.email = email
    this.passwordHash = passwordHash
    this.fullName = fullName
    this.role = role || 'user'
    this.isActive = isActive !== undefined ? isActive : true
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    this.dateOfBirth = dateOfBirth
    this.gender = gender
    this.phoneNumber = phoneNumber
    this.googleId = googleId
    this.facebookId = facebookId
    this.appleId = appleId
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

  updateProfile({ fullName, dateOfBirth, gender, phoneNumber }) {
    if (fullName !== undefined) this.fullName = fullName
    if (dateOfBirth !== undefined) this.dateOfBirth = dateOfBirth
    if (gender !== undefined) this.gender = gender
    if (phoneNumber !== undefined) this.phoneNumber = phoneNumber
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
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      phoneNumber: this.phoneNumber,
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
      dateOfBirth: row.date_of_birth,
      gender: row.gender,
      phoneNumber: row.phone_number,
      googleId: row.google_id,
      facebookId: row.facebook_id,
      appleId: row.apple_id,
    })
  }
}

module.exports = User
