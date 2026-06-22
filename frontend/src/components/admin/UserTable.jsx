import { useState } from 'react';

export default function UserTable({ users, onToggleStatus, onEdit, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-800/50 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white"
          >
            <option value="all">Tất cả</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg">
          ➕ Thêm user
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800/30 border-b border-slate-700">
            <tr className="text-left text-slate-400 text-xs uppercase">
              <th className="p-4">#</th>
              <th className="p-4">Tên</th>
              <th className="p-4">Email</th>
              <th className="p-4">Vai trò</th>
              <th className="p-4">Trạng thái</th>
              <th className="p-4 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user, index) => (
                <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="p-4 text-slate-400">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="p-4 font-medium">{user.name}</td>
                  <td className="p-4 text-slate-400">{user.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.role === 'admin' 
                        ? 'bg-purple-500/20 text-purple-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => onToggleStatus(user.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.isActive 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {user.isActive ? '🟢 Đang dùng' : '🔴 Đã khóa'}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => onEdit(user)} 
                      className="text-teal-400 hover:text-teal-300 mr-2"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => onDelete(user.id)} 
                      className="text-red-400 hover:text-red-300"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-800/50 flex justify-between items-center">
          <span className="text-sm text-slate-500">
            Trang {currentPage}/{totalPages}
          </span>
          <div className="flex gap-1">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1} 
              className="px-3 py-1 bg-slate-800 rounded-lg disabled:opacity-40"
            >
              ←
            </button>
            <span className="px-3 py-1 bg-teal-600 rounded-lg">{currentPage}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages} 
              className="px-3 py-1 bg-slate-800 rounded-lg disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}