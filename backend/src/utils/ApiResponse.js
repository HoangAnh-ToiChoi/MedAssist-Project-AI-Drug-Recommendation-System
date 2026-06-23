class ApiResponse {
  static success(data, message = 'Thành công') {
    return { success: true, message, data }
  }

  static error(message, code = null) {
    return { success: false, message, ...(code && { code }) }
  }
}

module.exports = ApiResponse
