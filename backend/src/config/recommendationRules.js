const MAX_RECOMMENDATIONS = 5

const DANGER_SYMPTOM_MESSAGES = {
  kho_tho: 'Khó thở có thể là dấu hiệu bệnh phổi hoặc tim mạch. Đến cơ sở y tế ngay.',
  dau_nguc: 'Đau ngực có thể là triệu chứng nhồi máu cơ tim. Gọi 115 ngay!',
}

const DEFAULT_DOSAGE_GUIDANCE = 'Theo chỉ định của bác sĩ hoặc hướng dẫn sử dụng.'

const buildRecommendationReason = (matchedSymptomCount) => {
  if (Number(matchedSymptomCount) > 1) {
    return `Gợi ý thuốc dựa trên ${matchedSymptomCount} triệu chứng phù hợp.`
  }

  return 'Gợi ý thuốc dựa trên triệu chứng đã chọn.'
}

module.exports = {
  MAX_RECOMMENDATIONS,
  DANGER_SYMPTOM_MESSAGES,
  DEFAULT_DOSAGE_GUIDANCE,
  buildRecommendationReason,
}
