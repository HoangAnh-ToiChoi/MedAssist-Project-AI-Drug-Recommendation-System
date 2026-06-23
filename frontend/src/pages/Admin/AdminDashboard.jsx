import { useState } from 'react';
import StatsCards from '../../components/admin/StatsCards';
import UserTable from '../../components/admin/UserTable';

export default function AdminDashboard() {
  const [users, setUsers] = useState([
    { id: 1, name: 'Nguyễn Văn A', email: 'a@example.com', role: 'user', isActive: true },
    { id: 2, name: 'Trần Thị B', email: 'b@example.com', role: 'admin', isActive: true },
    { id: 3, name: 'Lê Văn C', email: 'c@example.com', role: 'user', isActive: false },
    { id: 4, name: 'Phạm Thị D', email: 'd@example.com', role: 'user', isActive: true },
  ]);

  const handleToggleStatus = (userId) => {
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, isActive: !u.isActive } : u
    ));
  };

  const handleEdit = (user) => {
    alert(`✏️ Sửa user: ${user.name}`);
  };

  const handleDelete = (userId) => {
    if (confirm('Xóa user này?')) {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const activeCount = users.filter(u => u.isActive).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">📊 Quản lý người dùng</h1>
      <p className="text-slate-400 text-sm mb-4">
        Quản lý tài khoản, phân quyền và trạng thái hoạt động
      </p>
      
      <StatsCards 
        total={users.length} 
        active={activeCount} 
        blocked={users.length - activeCount} 
      />
      
      <UserTable 
        users={users}
        onToggleStatus={handleToggleStatus}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}