const ApiResponse = require('../utils/ApiResponse')

class ChatbotController {
  #chatbotService

  constructor(chatbotService) {
    this.#chatbotService = chatbotService
  }

  async chatOnRecommendation(req, res, next) {
    try {
      const result = await this.#chatbotService.chatOnRecommendation(req.user.id, req.body)
      res.json(ApiResponse.success(result, 'Chatbot grounded trả lời thành công'))
    } catch (err) {
      next(err)
    }
  }
}

module.exports = ChatbotController
