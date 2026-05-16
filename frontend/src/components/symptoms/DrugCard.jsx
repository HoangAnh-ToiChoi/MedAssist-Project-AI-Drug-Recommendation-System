import React, { useState } from 'react'

// Card hiển thị thông tin một loại thuốc được gợi ý
const DrugCard = ({ drug }) => {
  const [expanded, setExpanded] = useState(false)

  // Màu confidence dựa trên điểm tin cậy
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const confidencePercent = Math.round((drug.confidence || 0) * 100)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-base">{drug.name}</h3>
          {drug.generic_name && (
            <p className="text-sm text-gray-500 mt-0.5">({drug.generic_name})</p>
          )}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getConfidenceColor(drug.confidence)}`}>
          {confidencePercent}% phù hợp
        </span>
      </div>

      {drug.category && (
        <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-secondary text-xs rounded-md">
          {drug.category}
        </span>
      )}

      {drug.reason && (
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">{drug.reason}</p>
      )}

      {/* Thông tin mở rộng */}
      {drug.description && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-secondary hover:underline flex items-center gap-1"
          >
            {expanded ? 'Thu gọn' : 'Xem thêm'}
            <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expanded && (
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <p>{drug.description}</p>
              {drug.dosage && <p><span className="font-medium">Liều dùng:</span> {drug.dosage}</p>}
              {drug.contraindications && (
                <p className="text-red-600">
                  <span className="font-medium">Chống chỉ định:</span> {drug.contraindications}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DrugCard
