import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import PageHeader from '../components/common/PageHeader';
import SafetyChecklist from '../components/dashboard/SafetyChecklist';
import FeatureCard from '../components/dashboard/FeatureCard';
import api from '../services/api';

const Dashboard = () => {
  const [allergiesCount, setAllergiesCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem('user');
      return stored && stored !== 'undefined' ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
      return {};
    }
  };

  const user = getStoredUser();

  useEffect(() => {
    const fetchHealthProfileStatus = async () => {
      try {
        const [allergiesRes, historyRes] = await Promise.all([
          api.get('/allergies'),
          api.get('/history')
        ]);
        const allergiesData = allergiesRes.data?.data || allergiesRes.data || [];
        const historyData = historyRes.data?.data || historyRes.data || [];
        setAllergiesCount(allergiesData.length);
        setHistoryCount(historyData.length);
      } catch (err) {
        console.error('Failed to fetch user safety checklist status:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHealthProfileStatus();
  }, []);

  // Professional recent activities list
  const recentActivities = [
    { 
      id: 1, 
      date: 'Hôm nay, 10:24 AM', 
      type: 'Kiểm tra triệu chứng', 
      desc: 'Hỗ trợ ban đầu cho triệu chứng mệt mỏi, khó ngủ.', 
      status: 'Đã hoàn thành' 
    },
    { 
      id: 2, 
      date: 'Hôm qua, 02:15 PM', 
      type: 'Khai báo dị ứng', 
      desc: `Cập nhật thông tin dị ứng hoạt chất thuốc. (Tổng số hoạt chất dị ứng: ${allergiesCount})`, 
      status: 'An toàn' 
    },
    { 
      id: 3, 
      date: '18 Tháng 6, 2026', 
      type: 'Tiền sử bệnh án', 
      desc: `Cập nhật hồ sơ bệnh nền cho hệ thống. (Tổng số bệnh nền: ${historyCount})`, 
      status: 'Đã lưu' 
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans">
      {/* Background Glowing Orbs */}
      <div className="bg-glow-orb w-[400px] h-[400px] bg-teal-500/5 top-[10%] left-[-10%]"></div>
      <div className="bg-glow-orb w-[500px] h-[500px] bg-sky-500/5 bottom-[-10%] right-[-10%]"></div>

      <Navbar />

      <div className="relative z-10 flex-grow container mx-auto px-6 py-8 max-w-6xl space-y-8">
        
        {/* Welcome Section */}
        <div className="glass-card p-6 md:p-8 rounded-2xl border-teal-500/5 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-teal-500/5 to-transparent rounded-bl-full"></div>
          
          <div className="space-y-1.5">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Chào mừng trở lại, <span className="text-gradient-neon">{user.fullName || 'Thành viên'}</span>!
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Trợ lý y tế thông minh MedAssist AI đồng hành giúp rà soát chống chỉ định thuốc. Vui lòng khai báo đầy đủ thông tin y tế để được bảo vệ tốt nhất.
            </p>
          </div>

          <div className="flex gap-4 items-center">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Tài khoản xác thực</span>
              <span className="text-sm font-semibold text-teal-400">{user.email}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500 to-sky-600 flex items-center justify-center font-extrabold text-white text-lg shadow-lg">
              {(user.fullName || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Safety Checklist widget */}
        {loading ? (
          <div className="glass-card p-6 rounded-2xl animate-pulse flex flex-col gap-3">
            <div className="h-4 w-1/3 bg-slate-800 rounded"></div>
            <div className="h-3 w-2/3 bg-slate-800 rounded"></div>
            <div className="h-6 w-1/2 bg-slate-800 rounded mt-2"></div>
          </div>
        ) : (
          <SafetyChecklist 
            hasAllergies={allergiesCount > 0} 
            hasHistory={historyCount > 0} 
          />
        )}

        {/* Main Feature Cards */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-500 tracking-wider uppercase px-1">Chức năng chính</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            
            <FeatureCard
              title="Kiểm tra triệu chứng"
              description="Khai báo các triệu chứng của bạn để nhận đề xuất hỗ trợ ban đầu và gợi ý thuốc tham khảo an toàn từ AI."
              to="/symptoms"
              icon="🔍"
              status="Hỗ trợ ban đầu"
              accentColor="teal"
            />

            <FeatureCard
              title="Tiền sử bệnh lý"
              description="Lưu trữ bệnh nền (hen suyễn, huyết áp, tiểu đường...) để AI đối chiếu và loại bỏ thuốc gây biến chứng."
              to="/medical-history"
              icon="📋"
              status={`${historyCount} bệnh nền đã ghi nhận`}
              accentColor="sky"
            />

            <FeatureCard
              title="Dị ứng thuốc"
              description="Khai báo hoạt chất hoặc tên thuốc bạn bị dị ứng để trợ lý AI chủ động ngăn chặn và cảnh báo nguy cơ."
              to="/allergies"
              icon="⚠️"
              status={`${allergiesCount} hoạt chất dị ứng`}
              accentColor="amber"
            />

          </div>
        </div>

        {/* Recent Activities Section */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-500 tracking-wider uppercase px-1">Hoạt động gần đây</h2>
          
          <div className="glass-card rounded-2xl p-6 border-white/5 space-y-6">
            <div className="flow-root">
              <ul className="-mb-8">
                {recentActivities.map((act, actIdx) => (
                  <li key={act.id}>
                    <div className="relative pb-8">
                      {actIdx !== recentActivities.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-800" aria-hidden="true"></span>
                      ) : null}
                      
                      <div className="relative flex space-x-3 items-start">
                        <div>
                          <span className={`h-8 w-8 rounded-lg flex items-center justify-center ring-4 ring-[#0B0F19] ${
                            act.id === 1 ? 'bg-teal-500/10 text-teal-400' : 
                            act.id === 2 ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'
                          }`}>
                            {act.id === 1 ? '🔍' : act.id === 2 ? '⚠️' : '📋'}
                          </span>
                        </div>
                        
                        <div className="flex-grow min-w-0 flex justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{act.type}</p>
                            <p className="text-xs text-slate-400 mt-1">{act.desc}</p>
                          </div>
                          <div className="text-right text-[10px] whitespace-nowrap text-slate-500 space-y-1">
                            <time className="block font-medium">{act.date}</time>
                            <span className={`inline-block px-2 py-0.5 rounded-full font-bold border text-[9px] uppercase tracking-wider ${
                              act.id === 1 ? 'bg-teal-500/5 border-teal-500/10 text-teal-400' : 
                              act.id === 2 ? 'bg-amber-500/5 border-amber-500/10 text-amber-400' : 
                              'bg-sky-500/5 border-sky-500/10 text-sky-400'
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