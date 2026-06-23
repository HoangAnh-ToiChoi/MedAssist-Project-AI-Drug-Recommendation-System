import { useEffect, useState } from 'react';
import Navbar from '../components/common/Navbar';
import api from '../services/api';

const SummaryCard = ({ label, value, helper }) => (
  <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.28)]">
    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
    <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    {helper ? <p className="mt-2 text-sm text-slate-400">{helper}</p> : null}
  </div>
);

function AiInsights() {
  const storedUser = (() => {
    try {
      const raw = localStorage.getItem('user');
      return raw && raw !== 'undefined' ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();
  const isAdmin = storedUser?.role === 'admin';
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Filter States
  const [days, setDays] = useState(7);
  const [eventType, setEventType] = useState('');
  const [status, setStatus] = useState('');
  const [fallbackUsed, setFallbackUsed] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null); // Detailed modal payload

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const summaryParams = new URLSearchParams({
        global: 'true',
        days: days.toString(),
      });
      if (eventType) summaryParams.append('eventType', eventType);

      const eventParams = new URLSearchParams({
        global: 'true',
        days: days.toString(),
        limit: '30',
      });
      if (eventType) eventParams.append('eventType', eventType);
      if (status) eventParams.append('status', status);
      if (fallbackUsed) eventParams.append('fallbackUsed', fallbackUsed);

      const [summaryRes, eventsRes] = await Promise.all([
        api.get(`/ai/insights/summary?${summaryParams.toString()}`),
        api.get(`/ai/insights/events?${eventParams.toString()}`),
      ]);

      setSummary(summaryRes.data.data);
      setEvents(eventsRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu AI Insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setError('Bạn không có quyền xem AI Insights.');
      return;
    }
    loadData();
  }, [isAdmin, days, eventType, status, fallbackUsed]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.16),transparent_32%),linear-gradient(180deg,#020617_0%,#07111f_48%,#020617_100%)] text-white">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-teal-300/80">AI Observability</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">AI Insights Dashboard</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Giám sát hệ thống: xem tỷ lệ fallback, nhà cung cấp AI, chất lượng phản hồi và chi tiết payload kiểm tra.
            </p>
          </div>
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-xl transition"
          >
            Làm mới
          </button>
        </section>

        {/* Global Controls Filter Panel */}
        <section className="mb-8 p-6 rounded-3xl border border-white/10 bg-white/5 flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400">Khoảng thời gian</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-teal-500/55 text-slate-200"
            >
              <option value="1">24 giờ qua</option>
              <option value="7">7 ngày qua</option>
              <option value="30">30 ngày qua</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400">Loại Sự Kiện</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-teal-500/55 text-slate-200"
            >
              <option value="">Tất cả</option>
              <option value="recommendation_explanation">Giải thích thuốc</option>
              <option value="grounded_chatbot">Chatbot hội thoại</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400">Trạng thái</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-teal-500/55 text-slate-200"
            >
              <option value="">Tất cả</option>
              <option value="success">Thành công (success)</option>
              <option value="fallback">Dự phòng (fallback)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400">Chế độ định tuyến</label>
            <select
              value={fallbackUsed}
              onChange={(e) => setFallbackUsed(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-teal-500/55 text-slate-200"
            >
              <option value="">Tất cả</option>
              <option value="false">Gọi trực tiếp (Direct)</option>
              <option value="true">Gọi dự phòng (Fallback)</option>
            </select>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">
            Đang tải dữ liệu AI audit analytics...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5 text-rose-200">
            {error}
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Fallback Rate" value={`${summary?.fallbackRate || 0}%`} helper={`Thời gian: ${days} ngày`} />
              <SummaryCard label="Avg Latency" value={`${summary?.avgLatencyMs || 0}ms`} helper={`P95: ${summary?.p95LatencyMs || 0}ms`} />
              <SummaryCard label="Audit Rows" value={summary?.rowCount || 0} helper="Tổng sự kiện tìm thấy" />
              <SummaryCard
                label="Quality"
                value={Object.entries(summary?.qualityBreakdown || {}).map(([key, count]) => `${key}:${count}`).join(' • ') || 'none'}
                helper="Quality guard status"
              />
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold">Sự kiện gần đây</h2>
                <p className="text-xs text-slate-400 mt-1">Nhấp vào bất kỳ sự kiện nào để xem chi tiết Request/Response payload.</p>
                
                <div className="mt-5 space-y-3">
                  {events.length === 0 ? (
                    <div className="text-slate-400 text-sm py-10 text-center">Không tìm thấy sự kiện nào trùng khớp.</div>
                  ) : (
                    events.map((event) => (
                      <div 
                        key={event.id} 
                        onClick={() => setSelectedEvent(event)}
                        className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 hover:border-teal-500/30 hover:bg-slate-900/40 transition cursor-pointer"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="font-semibold text-teal-400">{event.userEmail}</span>
                          <span>•</span>
                          <span>{event.eventType === 'recommendation_explanation' ? 'Giải thích thuốc' : 'Chatbot'}</span>
                          <span>•</span>
                          <span>{event.provider}</span>
                          <span>•</span>
                          <span>{event.latencyMs}ms</span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex gap-2">
                            <span className={`rounded-full px-3 py-1 ${event.fallbackUsed ? 'bg-amber-500/15 text-amber-200' : 'bg-emerald-500/15 text-emerald-200'}`}>
                              {event.fallbackUsed ? 'Fallback' : 'Direct'}
                            </span>
                            <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sky-200">{event.status}</span>
                            {event.qualityStatus ? (
                              <span className={`rounded-full px-3 py-1 ${event.qualityStatus === 'fail' ? 'bg-rose-500/15 text-rose-300' : 'bg-violet-500/15 text-violet-200'}`}>
                                quality: {event.qualityStatus}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-slate-500">{new Date(event.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                        {event.errorMessage ? (
                          <p className="mt-3 text-sm text-rose-300 bg-rose-950/20 p-2 rounded-lg border border-rose-500/10">{event.errorMessage}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 self-start space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Breakdown</h2>
                  <p className="text-xs text-slate-400 mt-1">Phân bổ nhà cung cấp AI dịch vụ</p>
                  
                  <div className="mt-5 space-y-2 text-sm text-slate-200">
                    {Object.entries(summary?.providerBreakdown || {}).map(([provider, count]) => (
                      <div key={provider} className="flex items-center justify-between rounded-2xl bg-slate-950/40 px-4 py-3">
                        <span className="capitalize">{provider}</span>
                        <span className="font-semibold text-teal-400">{count} lượt</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Các Lỗi Nổi Bật</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-200">
                    {(summary?.topErrors || []).length === 0 ? (
                      <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-emerald-200">Không có lỗi hệ thống ghi nhận.</div>
                    ) : (
                      summary.topErrors.map((item) => (
                        <div key={item.message} className="rounded-2xl bg-slate-950/40 p-4">
                          <p className="text-rose-300 text-xs break-all">{item.message}</p>
                          <p className="mt-2 text-[10px] text-slate-500 font-semibold uppercase">Số lần ghi nhận: {item.count}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Payload Inspection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-[#0F172A] text-slate-100 overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
              <div>
                <h3 className="text-lg font-bold text-white">Kiểm tra Chi tiết Sự kiện</h3>
                <p className="text-xs text-slate-400 mt-1">ID: {selectedEvent.id} | Bệnh nhân: {selectedEvent.userEmail}</p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-grow">
              <div className="grid gap-4 sm:grid-cols-3 text-xs p-4 bg-white/5 rounded-2xl border border-white/5">
                <div>
                  <span className="text-slate-400 block font-medium">Nhà cung cấp AI:</span>
                  <span className="text-slate-200 font-semibold capitalize">{selectedEvent.provider}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Độ trễ phản hồi:</span>
                  <span className="text-slate-200 font-semibold">{selectedEvent.latencyMs} ms</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Trạng thái:</span>
                  <span className="text-slate-200 font-semibold uppercase">{selectedEvent.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Sự kiện:</span>
                  <span className="text-slate-200 font-semibold">{selectedEvent.eventType === 'recommendation_explanation' ? 'Giải thích gợi ý' : 'Chatbot'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Chất lượng phản hồi:</span>
                  <span className="text-slate-200 font-semibold capitalize">{selectedEvent.qualityStatus || 'Chưa kiểm tra'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Thời gian tạo:</span>
                  <span className="text-slate-200 font-semibold">{new Date(selectedEvent.createdAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Yêu cầu gửi đi (Request Payload)</h4>
                  <pre className="p-4 rounded-2xl bg-slate-950 border border-white/5 text-[11px] font-mono text-teal-300 overflow-x-auto max-h-[300px] whitespace-pre-wrap">
                    {JSON.stringify(selectedEvent.requestPayload, null, 2)}
                  </pre>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Phản hồi nhận được (Response Payload)</h4>
                  <pre className="p-4 rounded-2xl bg-slate-950 border border-white/5 text-[11px] font-mono text-teal-300 overflow-x-auto max-h-[300px] whitespace-pre-wrap">
                    {JSON.stringify(selectedEvent.responsePayload, null, 2)}
                  </pre>
                </div>
              </div>

              {selectedEvent.errorMessage && (
                <div className="space-y-2">
                  <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Thông tin lỗi (Error Log)</h4>
                  <pre className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/10 text-[11px] font-mono text-rose-300 overflow-x-auto break-all">
                    {selectedEvent.errorMessage}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-900/60 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AiInsights;
