import React from 'react';

const PROVIDER_LABELS = {
  gemini: 'Gemini',
  groq: 'Groq',
  zhipu: 'Zhipu',
  'ai-service': 'AI Service',
  none: 'Deterministic fallback',
};

const RecommendationExplanationCard = ({ explanation }) => {
  if (!explanation) return null;

  const providerLabel = PROVIDER_LABELS[explanation.provider] || explanation.provider || 'Unknown';
  const isFallback =
    explanation.status === 'failed' ||
    explanation.status === 'fallback' ||
    explanation.enabled === false;

  return (
    <section className="glass-card rounded-2xl border-white/5 p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100">Giải thích gợi ý</h3>
          <p className="text-xs text-slate-400">
            Phần này dùng LLM để diễn giải kết quả đã được grounding từ backend và database.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className={`rounded-full border px-3 py-1 font-semibold ${
            isFallback
              ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
          }`}>
            {isFallback ? 'Fallback' : 'LLM grounded'}
          </span>
          <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 font-semibold text-slate-300">
            Provider: {providerLabel}
          </span>
        </div>
      </div>

      {explanation.summary && (
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Tóm tắt</h4>
          <p className="text-sm leading-relaxed text-slate-200">{explanation.summary}</p>
        </div>
      )}

      {explanation.explanation && (
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Diễn giải</h4>
          <p className="text-sm leading-relaxed text-slate-300">{explanation.explanation}</p>
        </div>
      )}

      {explanation.safetyNote && (
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
          <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-amber-300">Lưu ý an toàn</h4>
          <p className="text-sm leading-relaxed text-slate-300">{explanation.safetyNote}</p>
        </div>
      )}
    </section>
  );
};

export default RecommendationExplanationCard;
