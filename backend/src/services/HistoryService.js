const AppError = require("../utils/AppError");
const {
    invalidateRecommendationCache,
} = require("../utils/recommendationCache");

class HistoryService {
    #patientHistoryRepo;
    #redis;

    constructor(patientHistoryRepository, redisClient) {
        this.#patientHistoryRepo = patientHistoryRepository;
        this.#redis = redisClient;
    }

    async getHistory(userId) {
        return this.#patientHistoryRepo.findAllByUserId(userId);
    }

    async createHistory(userId, payload) {
        const result = await this.#patientHistoryRepo.createForUser(
            userId,
            payload,
        );
        await this.#invalidateCache(userId);
        return result;
    }

    async updateHistory(userId, historyId, payload) {
        const history = await this.#patientHistoryRepo.updateByIdAndUserId(
            historyId,
            userId,
            payload,
        );

        if (!history) {
            throw new AppError(
                "Không tìm thấy tiền sử bệnh",
                404,
                "HISTORY_NOT_FOUND",
            );
        }

        await this.#invalidateCache(userId);
        return history;
    }

    async deleteHistory(userId, historyId) {
        const deleted = await this.#patientHistoryRepo.deleteByIdAndUserId(
            historyId,
            userId,
        );

        if (!deleted) {
            throw new AppError(
                "Không tìm thấy tiền sử bệnh",
                404,
                "HISTORY_NOT_FOUND",
            );
        }

        await this.#invalidateCache(userId);
    }

    async #invalidateCache(userId) {
        try {
            await invalidateRecommendationCache(this.#redis, userId);
        } catch (err) {
            const logger = require("../utils/logger");
            logger.warn(
                `[Cache Invalidation Warning] Failed to clear Redis cache: ${err.message}`
            );
        }
    }
}

module.exports = HistoryService;
