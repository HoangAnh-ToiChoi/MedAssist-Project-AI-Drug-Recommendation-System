import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-white">
      {/* Sidebar */}
      <aside className="w-64 glass-card border-r border-slate-800/50 p-4 h-screen sticky top-0">
        <Link to="/admin" className="text-xl font-bold">🏥 MedAssist AI</Link>
        <nav className="mt-6 space-y-2">
          <Link to="/admin" className="block p-2 rounded hover:bg-teal-500/20">📊 Dashboard</Link>
          <Link to="/admin/users" className="block p-2 rounded hover:bg-teal-500/20">👥 Người dùng</Link>
        </nav>
        <button 
          onClick={logout} 
          className="mt-8 text-red-400 text-sm w-full text-left p-2 rounded hover:bg-red-500/10"
        >
          🚪 Đăng xuất
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        <header className="p-4 border-b border-slate-800/50 flex justify-between items-center">
          <span className="text-sm text-slate-400">Xin chào, Admin</span>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}