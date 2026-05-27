const axios = require('axios')

const chat = async (req, res) => {
  try {
    const { messages, temperature } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: 'Triệu chứng hoặc hội thoại không hợp lệ (yêu cầu mảng messages)',
        code: 'VALIDATION_ERROR'
      })
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000'
    
    // Call the internal AI service
    const response = await axios.post(`${aiServiceUrl}/ai/chat`, {
      messages,
      temperature: temperature !== undefined ? Number(temperature) : 0.7
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 12000 // 12 seconds timeout
    })

    const { success, content, provider, error } = response.data

    if (!success) {
      // The AI service fallback failed completely
      return res.status(502).json({
        success: false,
        message: content || 'Không thể lấy phản hồi từ chatbot AI.',
        code: 'AI_PROVIDER_ERROR',
        details: error
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        content,
        provider
      }
    })

  } catch (err) {
    console.error('Error in chatController:', err.message)
    
    if (err.code === 'ECONNREFUSED' || err.message.includes('timeout')) {
      return res.status(503).json({
        success: false,
        message: 'Dịch vụ AI hiện tại không khả dụng. Vui lòng thử lại sau.',
        code: 'AI_SERVICE_UNAVAILABLE'
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ nội bộ khi xử lý trò chuyện.',
      code: 'INTERNAL_ERROR',
      details: err.message
    })
  }
}

module.exports = {
  chat
}
