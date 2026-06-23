const AppError = require('../utils/AppError')
const logger = require('../utils/logger')

class ChatbotService {
  #recommendationRepo
  #patientHistoryRepo
  #allergyRepository
  #aiEngines
  #aiAuditLogService

  constructor(recommendationRepo, patientHistoryRepo, allergyRepository, aiEngines, aiAuditLogService) {
    this.#recommendationRepo = recommendationRepo
    this.#patientHistoryRepo = patientHistoryRepo
    this.#allergyRepository = allergyRepository
    this.#aiEngines = aiEngines || []
    this.#aiAuditLogService = aiAuditLogService
  }

  async chatOnRecommendation(userId, input) {
    const question = String(input.question || '').trim()
    if (!question) {
      throw new AppError('Câu hỏi là bắt buộc.', 400, 'QUESTION_REQUIRED')
    }

    const recommendationId = String(input.recommendationId || '').trim()
    if (!recommendationId) {
      throw new AppError('Recommendation ID là bắt buộc.', 400, 'RECOMMENDATION_ID_REQUIRED')
    }

    const recommendation = await this.#recommendationRepo.findByIdForUser(recommendationId, userId)
    if (!recommendation) {
      throw new AppError('Không tìm thấy recommendation phù hợp.', 404, 'RECOMMENDATION_NOT_FOUND')
    }

    const [historyEntities, allergies] = await Promise.all([
      this.#patientHistoryRepo.findChronicDiseasesByUserId(userId),
      this.#allergyRepository.findAllByUserId(userId),
    ])

    const history = historyEntities
      .map((item) => item.getCondition?.() || item.condition)
      .filter(Boolean)

    const groundedRecommendations = this.#normalizeRecommendations(input.recommendations)
    this.#assertGroundedRecommendationsMatchSnapshot(recommendation.outputDrugs, groundedRecommendations)

    const groundedPayload = {
      question,
      specialty: input.specialty || recommendation.inputSymptoms?.specialty || 'unknown',
      matchedSymptoms: this.#normalizeStringList(
        input.matchedSymptoms || recommendation.inputSymptoms?.symptoms || []
      ),
      topDiseases: Array.isArray(input.topDiseases) ? input.topDiseases : [],
      recommendations: groundedRecommendations.length > 0 ? groundedRecommendations : recommendation.outputDrugs,
      dangerAlert: input.dangerAlert || this.#normalizeDangerAlert(recommendation.dangerAlert),
      history,
      allergies: this.#normalizeAllergyNames(allergies),
      conversation: this.#normalizeConversation(input.conversation),
    }

    const chatEngine = this.#aiEngines.find(
      (engine) => typeof engine?.chatGroundedRecommendation === 'function'
    )
    const start = Date.now()

    if (!chatEngine) {
      const fallbackResponse = this.#buildDeterministicFallback(groundedPayload, null)
      await this.#recordAuditLog(userId, recommendationId, groundedPayload, fallbackResponse, {
        provider: null,
        status: 'disabled',
        latencyMs: Date.now() - start,
        fallbackUsed: true,
      })
      return fallbackResponse
    }

    try {
      const response = await chatEngine.chatGroundedRecommendation(groundedPayload)
      if (!response || !String(response.answer || '').trim()) {
        const fallbackResponse = this.#buildDeterministicFallback(
          groundedPayload,
          'AI grounded chat returned an empty response.'
        )
        await this.#recordAuditLog(userId, recommendationId, groundedPayload, fallbackResponse, {
          provider: response?.provider || this.#resolveProvider(chatEngine),
          status: 'fallback',
          latencyMs: Date.now() - start,
          fallbackUsed: true,
        })
        return fallbackResponse
      }

      const normalizedResponse = {
        success: response.success !== false,
        provider: response.provider || 'ai-service',
        answer: String(response.answer || '').trim(),
        safetyNote: String(response.safetyNote || '').trim() || this.#buildSafetyNote(groundedPayload),
        ...(response.quality ? { quality: response.quality } : {}),
        ...(response.error ? { error: String(response.error) } : {}),
      }
      await this.#recordAuditLog(userId, recommendationId, groundedPayload, normalizedResponse, {
        provider: normalizedResponse.provider,
        status: normalizedResponse.success ? 'success' : 'fallback',
        latencyMs: Date.now() - start,
        fallbackUsed: normalizedResponse.success !== true,
      })
      return normalizedResponse
    } catch (err) {
      logger.warn(
        `[AI Chatbot Warning] Engine ${chatEngine.constructor.name} failed: ${err.message}. Using deterministic fallback chat response.`
      )
      const fallbackResponse = this.#buildDeterministicFallback(groundedPayload, err.message)
      await this.#recordAuditLog(userId, recommendationId, groundedPayload, fallbackResponse, {
        provider: this.#resolveProvider(chatEngine),
        status: 'fallback',
        latencyMs: Date.now() - start,
        fallbackUsed: true,
      })
      return fallbackResponse
    }
  }

  #normalizeRecommendations(recommendations) {
    return Array.isArray(recommendations) ? recommendations : []
  }

  #normalizeStringList(items) {
    return [...new Set(
      (Array.isArray(items) ? items : [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )]
  }

  #normalizeConversation(conversation) {
    return (Array.isArray(conversation) ? conversation : [])
      .map((turn) => ({
        role: String(turn?.role || '').trim(),
        content: String(turn?.content || '').trim(),
      }))
      .filter((turn) => ['user', 'assistant'].includes(turn.role) && turn.content)
      .slice(-6)
  }

  #normalizeAllergyNames(allergies) {
    return this.#normalizeStringList(
      (Array.isArray(allergies) ? allergies : []).map(
        (allergy) => allergy?.genericName || allergy?.generic_name || allergy?.name || allergy?.drug_name || allergy
      )
    )
  }

  #normalizeDangerAlert(dangerAlert) {
    if (typeof dangerAlert === 'string') return dangerAlert
    if (dangerAlert && typeof dangerAlert === 'object') {
      try {
        return JSON.stringify(dangerAlert)
      } catch {
        return ''
      }
    }
    return ''
  }

  #normalizeDrugName(value) {
    return String(value || '').trim().toLowerCase()
  }

  #assertGroundedRecommendationsMatchSnapshot(snapshotRecommendations, groundedRecommendations) {
    if (!groundedRecommendations || groundedRecommendations.length === 0) {
      return
    }

    const snapshotKeys = new Set(
      (Array.isArray(snapshotRecommendations) ? snapshotRecommendations : [])
        .flatMap((drug) => [drug?.name, drug?.generic_name, drug?.genericName])
        .map((value) => this.#normalizeDrugName(value))
        .filter(Boolean)
    )

    const hasMismatch = groundedRecommendations.some((drug) => {
      const keys = [drug?.name, drug?.generic_name, drug?.genericName]
        .map((value) => this.#normalizeDrugName(value))
        .filter(Boolean)
      return keys.every((key) => !snapshotKeys.has(key))
    })

    if (hasMismatch) {
      throw new AppError(
        'Grounded recommendations không khớp với snapshot authoritative.',
        400,
        'GROUNDED_CONTEXT_MISMATCH'
      )
    }
  }

  #buildDeterministicFallback(payload, error) {
    const diseaseNames = (Array.isArray(payload.topDiseases) ? payload.topDiseases : [])
      .map((item) => item?.displayName || item?.display_name || item?.name || item?.code)
      .filter(Boolean)
      .slice(0, 2)
    const recommendationNames = (Array.isArray(payload.recommendations) ? payload.recommendations : [])
      .map((item) => item?.name)
      .filter(Boolean)
      .slice(0, 3)

    const answerParts = [
      'Hệ thống hiện chỉ hỗ trợ giải thích trong phạm vi recommendation đã được grounding và lọc an toàn.',
      `Câu hỏi của bạn: ${payload.question}.`,
      `Chuyên khoa đang xét: ${payload.specialty}.`,
    ]
    if (payload.matchedSymptoms.length > 0) {
      answerParts.push(`Triệu chứng đã đối chiếu: ${payload.matchedSymptoms.join(', ')}.`)
    }
    if (diseaseNames.length > 0) {
      answerParts.push(`Các bệnh đang cân nhắc: ${diseaseNames.join(', ')}.`)
    }
    if (recommendationNames.length > 0) {
      answerParts.push(`Các thuốc còn lại sau bước lọc an toàn: ${recommendationNames.join(', ')}.`)
    }
    if (payload.dangerAlert) {
      answerParts.push(`Cảnh báo hiện có: ${payload.dangerAlert}.`)
    }

    return {
      success: false,
      provider: 'none',
      answer: answerParts.join(' '),
      safetyNote: this.#buildSafetyNote(payload),
      ...(error ? { error } : {}),
    }
  }

  #buildSafetyNote(payload) {
    if (payload.dangerAlert) {
      return payload.dangerAlert
    }

    return 'Thông tin chỉ mang tính tham khảo và không thay thế tư vấn của bác sĩ hoặc dược sĩ.'
  }

  #resolveProvider(engine) {
    if (!engine) return null
    if (typeof engine.provider === 'string' && engine.provider.trim()) {
      return engine.provider.trim()
    }

    return engine.constructor?.name || 'unknown'
  }

  async #recordAuditLog(userId, recommendationId, requestPayload, responsePayload, metadata) {
    if (!this.#aiAuditLogService) {
      return
    }

    try {
      await this.#aiAuditLogService.record({
        userId,
        recommendationId,
        eventType: 'grounded_chatbot',
        provider: metadata.provider || responsePayload?.provider || null,
        status: metadata.status || 'unknown',
        fallbackUsed: Boolean(metadata.fallbackUsed),
        latencyMs: metadata.latencyMs,
        requestPayload,
        responsePayload,
        errorMessage: responsePayload?.error || null,
      })
    } catch (err) {
      logger.warn(`[AI Audit Warning] Failed to record grounded_chatbot audit log: ${err.message}`)
    }
  }
}

module.exports = ChatbotService
