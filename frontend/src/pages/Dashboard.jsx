import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';

const Dashboard = () => {
  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem('user');
      return stored && stored !== 'undefined' ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
      return {};
    }
  }

  const user = getStoredUser();

  // Fake recent activities for a highly premium layout
  const recentActivities = [
    { id: 1, date: 'Hôm nay, 10:24 AM', type: 'Kiểm tra triệu chứng', desc: 'Đau đầu, sốt nhẹ - Đã gợi ý Paracetamol', status: 'An toàn' },
    { id: 2, date: '21 Tháng 5, 2026', type: 'Cập nhật dị ứng', desc: 'Đã thêm dị ứng thuốc Penicillin', status: 'Đã cập nhật' },
    { id: 3, date: '18 Tháng 5, 2026', type: 'Tiền sử bệnh án', desc: 'Đã thêm tình trạng Cao huyết áp', status: 'Đã lưu' }
  ];

  return (
    <div className="relative min-h-screen bg-[#0B0B0C] text-gray-100 flex flex-col font-sans">
      {/* Background Glowing Orbs */}
      <div className="bg-glow-orb w-[400px] h-[400px] bg-[#00F0FF]/10 top-[20%] left-[-10%]"></div>
      <div className="bg-glow-orb w-[500px] h-[500px] bg-[#8A2BE2]/10 bottom-[-10%] right-[-10%]"></div>

      <Navbar />

      <div className="relative z-10 flex-grow container mx-auto px-6 py-10 max-w-6xl space-y-10">
        
        {/* Welcome Header Section */}
        <div className="glass-card p-6 md:p-8 rounded-2xl border-white/5 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#00F0FF]/10 to-transparent rounded-bl-full"></div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Chào mừng trở lại, <span className="text-gradient-neon">{user.fullName || 'Thành viên'}</span>!
            </h1>
            <p className="text-sm text-gray-400 max-w-xl">
              Hệ thống trợ lý y tế MedAssist AI luôn sẵn sàng đồng hành cùng bạn. Hôm nay bạn cảm thấy thế nào? Hãy cập nhật triệu chứng để AI hỗ trợ bạn nhé.
            </p>
          </div>

          <div className="flex gap-4 items-center">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-gray-500 block">Tài khoản xác thực</span>
              <span className="text-sm font-semibold text-[#00F0FF]">{user.email}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#00F0FF] to-[#8A2BE2] flex items-center justify-center font-extrabold text-black text-xl shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              {(user.fullName || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Dashboard Grid Options */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-300 tracking-wide uppercase px-1">Chức năng chính</h2>
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Card 1: Symptoms check */}
            <Link 
              to="/symptoms" 
              className="group glass-card p-6 rounded-2xl border-white/5 hover:border-[#00F0FF]/30 transition-all duration-300 relative overflow-hidden hover:-translate-y-1"
            >
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-[#00F0FF]/10 to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
              <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/20 flex items-center justify-center text-xl mb-6 shadow-[0_0_10px_rgba(0,240,255,0.1)] group-hover:scale-105 transition-transform">
                💊
              </div>
              <h3 className="font-bold text-xl text-white mb-2 group-hover:text-[#00F0FF] transition-colors">Kiểm tra triệu chứng</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Nhập triệu chứng cụ thể của bạn để nhận phân tích chi tiết và danh mục thuốc gợi ý an toàn từ AI.
              </p>
              <span className="text-xs font-semibold text-[#00F0FF] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Kiểm tra ngay &rarr;
              </span>
            </Link>

            {/* Card 2: Medical History */}
            <div 
              className="group glass-card p-6 rounded-2xl border-white/5 hover:border-[#8A2BE2]/30 transition-all duration-300 relative overflow-hidden cursor-pointer hover:-translate-y-1"
            >
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-[#8A2BE2]/10 to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
              <div className="w-10 h-10 rounded-xl bg-[#8A2BE2]/10 border border-[#8A2BE2]/20 flex items-center justify-center text-xl mb-6 shadow-[0_0_10px_rgba(138,43,226,0.1)] group-hover:scale-105 transition-transform">
                🧬
              </div>
              <h3 className="font-bold text-xl text-white mb-2 group-hover:text-[#8A2BE2] transition-colors">Tiền sử bệnh lý</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Đăng ký và lưu trữ bệnh nền (như huyết áp, tim mạch, tiểu đường) làm căn cứ kiểm duyệt thuốc.
              </p>
              <span className="text-xs font-semibold text-[#8A2BE2] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Quản lý tiền sử &rarr;
              </span>
            </div>

            {/* Card 3: Allergies */}
            <div 
              className="group glass-card p-6 rounded-2xl border-white/5 hover:border-[#FF007F]/30 transition-all duration-300 relative overflow-hidden cursor-pointer hover:-translate-y-1"
            >
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-[#FF007F]/10 to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
              <div className="w-10 h-10 rounded-xl bg-[#FF007F]/10 border border-[#FF007F]/20 flex items-center justify-center text-xl mb-6 shadow-[0_0_10px_rgba(255,0,127,0.1)] group-hover:scale-105 transition-transform">
                ⚠️
              </div>
              <h3 className="font-bold text-xl text-white mb-2 group-hover:text-[#FF007F] transition-colors">Dị ứng hoạt chất</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Cập nhật danh sách các hoạt chất/thuốc dị ứng để hệ thống AI chủ động cảnh báo và ngăn chặn nguy cơ.
              </p>
              <span className="text-xs font-semibold text-[#FF007F] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Cấu hình dị ứng &rarr;
              </span>
            </div>

          </div>
        </div>

        {/* Recent Activities Timeline Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-300 tracking-wide uppercase px-1">Hoạt động gần đây</h2>
          
          <div className="glass-card rounded-2xl p-6 border-white/5 space-y-6">
            <div className="flow-root">
              <ul className="-mb-8">
                {recentActivities.map((act, actIdx) => (
                  <li key={act.id}>
                    <div className="relative pb-8">
                      {actIdx !== recentActivities.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-white/5" aria-hidden="true"></span>
                      ) : null}
                      
                      <div className="relative flex space-x-3 items-start">
                        <div>
                          <span className={`h-8 w-8 rounded-lg flex items-center justify-center ring-4 ring-[#0B0B0C] ${
                            act.id === 1 ? 'bg-[#00F0FF]/15 text-[#00F0FF]' : 
                            act.id === 2 ? 'bg-[#FF007F]/15 text-[#FF007F]' : 'bg-[#8A2BE2]/15 text-[#8A2BE2]'
                          }`}>
                            {act.id === 1 ? '💊' : act.id === 2 ? '⚠️' : '🧬'}
                          </span>
                        </div>
                        
                        <div className="flex-grow min-w-0 flex justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">{act.type}</p>
                            <p className="text-xs text-gray-400 mt-1">{act.desc}</p>
                          </div>
                          <div className="text-right text-[10px] whitespace-nowrap text-gray-500 space-y-1">
                            <time className="block">{act.date}</time>
                            <span className={`inline-block px-2 py-0.5 rounded-full font-semibold border ${
                              act.id === 1 ? 'bg-[#00F0FF]/5 border-[#00F0FF]/20 text-[#00F0FF]' : 
                              act.id === 2 ? 'bg-[#FF007F]/5 border-[#FF007F]/20 text-[#FF007F]' : 
                              'bg-[#8A2BE2]/5 border-[#8A2BE2]/20 text-[#8A2BE2]'
                            }`}>
                              {act.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
