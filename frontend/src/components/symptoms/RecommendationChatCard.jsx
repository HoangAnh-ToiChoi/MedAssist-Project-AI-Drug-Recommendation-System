import React, { useMemo, useState } from 'react';
import api from '../../services/api';

const QUICK_PROMPTS = [
  'Vì sao hệ thống giữ lại các thuốc này?',
  'Khi nào tôi nên đi khám thay vì tự theo dõi?',
  'Cảnh báo an toàn quan trọng nhất ở kết quả này là gì?',
];

const RecommendationChatCard = ({
  recommendationId,
  specialty,
  matchedSymptoms,
  topDiseases,
  recommendations,
  dangerAlert,
  llmExplanation,
}) => {
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState(() => (
    llmExplanation?.summary
      ? [
          {
            role: 'assistant',
            content: llmExplanation.summary,
            safetyNote: llmExplanation.safetyNote || '',
            provider: llmExplanation.provider || 'none',
          },
        ]
      : []
  ));

  const canAsk = useMemo(
    () => Boolean(recommendationId && specialty && recommendations?.length >= 0),
    [recommendationId, specialty, recommendations]
  );

  const submitQuestion = async (questionText) => {
    const question = String(questionText || '').trim();
    if (!question || !canAsk || loading) return;

    const nextConversation = [
      ...messages.map((item) => ({ role: item.role, content: item.content })),
      { role: 'user', content: question },
    ].slice(-6);

    setLoading(true);
    setError('');
    setMessages((current) => [...current, { role: 'user', content: question }]);
    setDraft('');

    try {
      const response = await api.post('/chatbot/recommendation', {
        recommendationId,
        question,
        specialty,
        matchedSymptoms,
        topDiseases,
        recommendations,
        dangerAlert,
        conversation: nextConversation,
      });

      const data = response.data?.data || response.data || {};
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: data.answer || 'Hệ thống chưa tạo được câu trả lời phù hợp.',
          safetyNote: data.safetyNote || '',
          provider: data.provider || 'none',
        },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi câu hỏi tới trợ lý grounded lúc này.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="grounded-chatbot"
      className="glass-card rounded-2xl border-white/5 p-5 space-y-4 scroll-mt-24"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100">Chatbot grounded theo kết quả hiện tại</h3>
          <p className="text-xs text-slate-400">
            Chỉ trả lời trong phạm vi recommendation đã được backend lọc theo dị ứng, bệnh nền và cảnh báo an toàn.
          </p>
        </div>
        <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-[11px] font-semibold text-slate-300">
          Recommendation ID: {recommendationId || 'N/A'}
        </span>
      </div>

      {messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-2xl border p-3 text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'border-sky-500/20 bg-sky-500/10 text-slate-100'
                  : 'border-white/5 bg-slate-950/40 text-slate-300'
              }`}
            >
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {message.role === 'user' ? 'Bạn hỏi' : `Trợ lý grounded${message.provider ? ` • ${message.provider}` : ''}`}
              </div>
              <p>{message.content}</p>
              {message.role === 'assistant' && message.safetyNote && (
                <div className="mt-3 rounded-xl border border-amber-500/15 bg-amber-500/5 p-2.5 text-xs text-slate-300">
                  <span className="font-semibold text-amber-300">Lưu ý an toàn:</span> {message.safetyNote}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={!canAsk || loading}
            onClick={() => submitQuestion(prompt)}
            className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-teal-500/30 hover:text-teal-300 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder="Hỏi thêm về lý do gợi ý, cảnh báo an toàn, hoặc khi nào nên đi khám..."
          className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-500/40"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            Chatbot không tự thêm thuốc hoặc thay thế chẩn đoán của bác sĩ.
          </p>
          <button
            type="button"
            onClick={() => submitQuestion(draft)}
            disabled={!draft.trim() || !canAsk || loading}
            className="btn-gradient rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {loading ? 'Đang trả lời...' : 'Gửi câu hỏi'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default RecommendationChatCard;
