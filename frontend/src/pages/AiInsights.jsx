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

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setError('Ban khong co quyen xem AI Insights.');
      return;
    }
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [summaryRes, eventsRes] = await Promise.all([
          api.get('/ai/insights/summary?days=7'),
          api.get('/ai/insights/events?days=7&limit=10'),
        ]);
        if (!active) return;
        setSummary(summaryRes.data.data);
        setEvents(eventsRes.data.data || []);
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.message || 'Khong the tai AI insights luc nay.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.16),transparent_32%),linear-gradient(180deg,#020617_0%,#07111f_48%,#020617_100%)] text-white">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-teal-300/80">AI Observability</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">AI Insights</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300">
            Theo doi fallback rate, provider, quality guard va cac su kien grounded explain/chat gan day.
          </p>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">
            Dang tai AI audit analytics...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5 text-rose-200">
            {error}
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Fallback Rate" value={`${summary?.fallbackRate || 0}%`} helper="7 ngay gan day" />
              <SummaryCard label="Avg Latency" value={`${summary?.avgLatencyMs || 0}ms`} helper={`P95 ${summary?.p95LatencyMs || 0}ms`} />
              <SummaryCard label="Audit Rows" value={summary?.rowCount || 0} helper="Explain + grounded chat" />
              <SummaryCard
                label="Quality"
                value={Object.entries(summary?.qualityBreakdown || {}).map(([key, count]) => `${key}:${count}`).join(' • ') || 'none'}
                helper="Quality guard breakdown"
              />
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold">Su kien gan day</h2>
                <div className="mt-5 space-y-3">
                  {events.map((event) => (
                    <div key={event.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>{event.eventType}</span>
                        <span>•</span>
                        <span>{event.provider}</span>
                        <span>•</span>
                        <span>{event.latencyMs}ms</span>
                        <span>•</span>
                        <span>{new Date(event.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className={`rounded-full px-3 py-1 ${event.fallbackUsed ? 'bg-amber-500/15 text-amber-200' : 'bg-emerald-500/15 text-emerald-200'}`}>
                          {event.fallbackUsed ? 'Fallback' : 'Direct'}
                        </span>
                        <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sky-200">{event.status}</span>
                        {event.qualityStatus ? (
                          <span className="rounded-full bg-violet-500/15 px-3 py-1 text-violet-200">
                            quality {event.qualityStatus}
                          </span>
                        ) : null}
                      </div>
                      {event.errorMessage ? (
                        <p className="mt-3 text-sm text-rose-200">{event.errorMessage}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold">Breakdown</h2>

                <div className="mt-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Provider</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-200">
                    {Object.entries(summary?.providerBreakdown || {}).map(([provider, count]) => (
                      <div key={provider} className="flex items-center justify-between rounded-2xl bg-slate-950/40 px-4 py-3">
                        <span>{provider}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Top Errors</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-200">
                    {(summary?.topErrors || []).length === 0 ? (
                      <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-emerald-200">Khong co loi noi bat.</div>
                    ) : (
                      summary.topErrors.map((item) => (
                        <div key={item.message} className="rounded-2xl bg-slate-950/40 px-4 py-3">
                          <p>{item.message}</p>
                          <p className="mt-1 text-xs text-slate-400">So lan: {item.count}</p>
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
    </div>
  );
}

export default AiInsights;
