export default function StatsCards({ total, active, blocked }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="glass-card p-4 rounded-xl text-center">
        <p className="text-slate-400 text-sm">Tổng user</p>
        <p className="text-2xl font-bold text-white">{total}</p>
      </div>
      <div className="glass-card p-4 rounded-xl text-center border-green-500/20">
        <p className="text-slate-400 text-sm">Đang hoạt động</p>
        <p className="text-2xl font-bold text-green-400">{active}</p>
      </div>
      <div className="glass-card p-4 rounded-xl text-center border-red-500/20">
        <p className="text-slate-400 text-sm">Đã khóa</p>
        <p className="text-2xl font-bold text-red-400">{blocked}</p>
      </div>
    </div>
  );
}