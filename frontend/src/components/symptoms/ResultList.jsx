import React from 'react'
import DrugCard from './DrugCard'
import EmptyState from '../common/EmptyState'

// Danh sách kết quả gợi ý thuốc từ AI
const ResultList = ({ recommendations }) => {
  if (!recommendations) return null

  const { recommendations: drugs = [], total, engine_version } = recommendations

  if (drugs.length === 0) {
    return (
      <EmptyState
        title="Không tìm thấy thuốc phù hợp"
        description="Hãy thử chọn thêm triệu chứng hoặc mô tả chi tiết hơn"
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Tìm thấy <span className="font-semibold text-primary">{total}</span> gợi ý phù hợp
        </p>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
          Engine: {engine_version || 'v1.0'}
        </span>
      </div>

      <div className="space-y-4">
        {drugs.map((drug, index) => (
          <DrugCard key={drug.id || index} drug={drug} />
        ))}
      </div>

      {/* Cảnh báo y tế */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800">
          <span className="font-semibold">Lưu ý:</span> Kết quả này chỉ mang tính chất tham khảo.
          Hãy tham khảo ý kiến bác sĩ trước khi sử dụng bất kỳ loại thuốc nào.
        </p>
      </div>
    </div>
  )
}

export default ResultList
