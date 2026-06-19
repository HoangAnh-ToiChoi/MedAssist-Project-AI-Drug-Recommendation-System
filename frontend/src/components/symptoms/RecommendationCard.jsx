import React, { useState } from 'react';

const RecommendationCard = ({ drug }) => {
  const [expanded, setExpanded] = useState(false);
  const confidencePercent = Math.round((drug.confidence || 0) * 100);

  const getConfidenceStyles = (confidence) => {
    if (confidence >= 0.8) {
      return 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20';
    }
    if (confidence >= 0.6) {
      return 'text-amber-400 bg-amber-500/5 border-amber-500/20';
    }
    return 'text-rose-400 bg-rose-500/5 border-rose-500/20';
  };

  return (
    <div className="glass-card rounded-2xl p-5 hover:border-teal-500/30 transition-all duration-300 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-bold text-white text-lg group-hover:text-teal-400 transition-colors">
            {drug.name}
          </h3>
          {drug.generic_name && (
            <p className="text-xs text-slate-400">
              Tên gốc: <span className="italic font-medium">{drug.generic_name}</span>
            </p>
          )}
        </div>
        <span className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold border ${getConfidenceStyles(drug.confidence)}`}>
          {confidencePercent}% phù hợp
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {drug.category && (
          <span className="px-2.5 py-0.5 bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[10px] font-semibold rounded-md uppercase tracking-wider">
            {drug.category}
          </span>
        )}
        <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold rounded-md uppercase tracking-wider flex items-center gap-1">
          <span>✓</span> Đã lọc theo hồ sơ dị ứng & bệnh án
        </span>
      </div>

      {drug.reason && (
        <p className="mt-4 text-xs md:text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3.5 rounded-xl border border-slate-900">
          <span className="text-teal-400 font-semibold">Chỉ định hỗ trợ:</span> {drug.reason}
        </p>
      )}

      {/* Expanded details panel */}
      {drug.description && (
        <div className="mt-4 pt-3 border-t border-slate-800/60">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-teal-400 font-semibold hover:text-teal-300 flex items-center gap-1.5 focus:outline-none"
          >
            {expanded ? 'Thu gọn thông tin' : 'Xem thông tin mở rộng'}
            <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expanded && (
            <div className="mt-3 text-xs text-slate-400 space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-900 animate-fadeIn">
              <p className="leading-relaxed">{drug.description}</p>
              
              {drug.dosage && (
                <p className="flex items-start gap-2">
                  <span className="font-semibold text-slate-200 min-w-[70px]">Liều dùng:</span>
                  <span className="text-slate-300">{drug.dosage}</span>
                </p>
              )}
              
              {drug.contraindications && (
                <div className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-lg text-rose-400">
                  <span className="font-semibold min-w-[100px] flex items-center gap-1">⚠️ Chống chỉ định:</span>
                  <span>{drug.contraindications}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendationCard;
