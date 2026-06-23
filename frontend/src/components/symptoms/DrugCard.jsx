import React, { useState } from 'react'

// Card hiển thị thông tin một loại thuốc được gợi ý (Premium Dark Mode)
const DrugCard = ({ drug }) => {
  const [expanded, setExpanded] = useState(false)

  // Màu sắc neon tương ứng với độ tin cậy
  const getConfidenceStyles = (confidence) => {
    if (confidence >= 0.8) {
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]';
    }
    if (confidence >= 0.6) {
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]';
    }
    return 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)]';
  }

  const confidencePercent = Math.round((drug.confidence || 0) * 100)

  return (
    <div className="glass-card rounded-2xl p-5 hover:border-[#00F0FF]/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-300 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-bold text-white text-lg group-hover:text-[#00F0FF] transition-colors">{drug.name}</h3>
          {drug.generic_name && (
            <p className="text-xs text-gray-400">Tên gốc: <span className="italic font-medium">{drug.generic_name}</span></p>
          )}
        </div>
        <span className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold border ${getConfidenceStyles(drug.confidence)}`}>
          {confidencePercent}% phù hợp
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3.5">
        {drug.category && (
          <span className="px-2.5 py-0.5 bg-[#8A2BE2]/10 border border-[#8A2BE2]/20 text-[#CD80F9] text-[10px] font-semibold rounded-md uppercase tracking-wider">
            {drug.category}
          </span>
        )}
      </div>

      {drug.reason && (
        <p className="mt-4 text-sm text-gray-300 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
          <span className="text-[#00F0FF] font-semibold">Chỉ định:</span> {drug.reason}
        </p>
      )}

      {/* Thông tin chi tiết mở rộng */}
      {drug.description && (
        <div className="mt-4 pt-3 border-t border-white/5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[#00F0FF] font-semibold hover:underline flex items-center gap-1.5 focus:outline-none"
          >
            {expanded ? 'Thu gọn thông tin' : 'Xem thông tin mở rộng'}
            <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expanded && (
            <div className="mt-3 text-xs text-gray-400 space-y-3 bg-black/40 p-4 rounded-xl border border-white/5 animate-fadeIn">
              <p className="leading-relaxed">{drug.description}</p>
              
              {drug.dosage && (
                <p className="flex items-start gap-2">
                  <span className="font-semibold text-white min-w-[70px]">Liều dùng:</span>
                  <span className="text-gray-300">{drug.dosage}</span>
                </p>
              )}
              
              {drug.contraindications && (
                <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/10 p-2.5 rounded-lg text-red-400">
                  <span className="font-semibold min-w-[100px] flex items-center gap-1">⚠️ Chống chỉ định:</span>
                  <span>{drug.contraindications}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DrugCard
