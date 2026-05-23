const ApiResponse = require('../utils/ApiResponse')

class RecommendationController {
  #recommendationService

  constructor(recommendationService) {
    this.#recommendationService = recommendationService
  }

  check = async (req, res, next) => {
    try {
      const result = await this.#recommendationService.checkSymptoms(
        req.user.userId,
        req.body.symptoms,
      )
      res.json(ApiResponse.success(result, 'Gợi ý thuốc thành công'))
    } catch (err) {
      next(err)
    }
  }
}

module.exports = RecommendationController
