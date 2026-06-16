const AppError = require('../utils/AppError')

class HistoryService {
  #patientHistoryRepo

  constructor(patientHistoryRepository) {
    this.#patientHistoryRepo = patientHistoryRepository
  }

  async getHistory(userId) {
    return this.#patientHistoryRepo.findAllByUserId(userId)
  }

  async createHistory(userId, payload) {
    return this.#patientHistoryRepo.createForUser(userId, payload)
  }

  async updateHistory(userId, historyId, payload) {
    const history = await this.#patientHistoryRepo.updateByIdAndUserId(historyId, userId, payload)
    if (!history) {
      throw new AppError('Không tìm thấy tiền sử bệnh', 404, 'HISTORY_NOT_FOUND')
    }

    return history
  }

  async deleteHistory(userId, historyId) {
    const deleted = await this.#patientHistoryRepo.deleteByIdAndUserId(historyId, userId)
    if (!deleted) {
      throw new AppError('Không tìm thấy tiền sử bệnh', 404, 'HISTORY_NOT_FOUND')
    }
  }
}

module.exports = HistoryService
