import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import DrugCard from '../components/symptoms/DrugCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

const DrugSuggestion = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('drugSuggestions');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const drugs = data.recommendations || data || [];
        setRecommendations(drugs);
      } catch (err) {
        console.error('Lỗi parse dữ liệu:', err);
      }
    }
    setLoading(false);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0B0B0C] text-gray-100 flex flex-col font-sans">
      {/* Background Glowing Orbs */}
      <div className="bg-glow-orb w-[400px] h-[400px] bg-[#00F0FF]/10 top-[20%] left-[-10%]"></div>
      <div className="bg-glow-orb w-[500px] h-[500px] bg-[#8A2BE2]/10 bottom-[-10%] right-[-10%]"></div>

      <Navbar />

      <div className="relative z-10 flex-grow container mx-auto px-6 py-12 max-w-3xl space-y-8">
        
        {/* Navigation back and header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Phác Đồ <span className="text-gradient-neon">Gợi Ý Thuốc</span>
            </h1>
            <p className="text-sm text-gray-400">
              Dựa trên danh sách các triệu chứng bạn cung cấp, hệ thống AI đề xuất các loại thuốc tham khảo dưới đây.
            </p>
          </div>

          <button
            onClick={() => navigate('/symptoms')}
            className="self-start sm:self-center px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 text-gray-300 bg-white/5 hover:bg-white/10 transition-all duration-300 flex items-center gap-1.5 focus:outline-none"
          >
            &larr; Thay đổi triệu chứng
          </button>
        </div>

        {/* Loading / Results Content */}
        {loading ? (
          <div className="glass-card p-10 rounded-2xl border-white/5 flex items-center justify-center">
            <LoadingSpinner text="AI đang đối chiếu dược lý học..." />
          </div>
        ) : recommendations.length === 0 ? (
          <EmptyState
            title="Chưa có kết quả gợi ý"
            description="Hệ thống chưa tìm thấy dữ liệu triệu chứng. Vui lòng quay trở lại trang nhập liệu để được AI hỗ trợ."
            action={
              <button
                onClick={() => navigate('/symptoms')}
                className="btn-gradient px-6 py-3 rounded-xl text-sm font-semibold tracking-wide shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              >
                Nhập triệu chứng ngay
              </button>
            }
          />
        ) : (
          <div className="space-y-6">
            
            {/* Caution Banner */}
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-xs text-amber-300 leading-relaxed flex gap-3 items-start shadow-[0_0_15px_rgba(245,158,11,0.05)]">
              <span className="text-lg">⚠️</span>
              <p>
                <strong>Khuyến cáo quan trọng:</strong> Kết quả trên được gợi ý tự động bằng mô hình Trí Tuệ Nhân Tạo (AI) dựa trên danh sách triệu chứng của bạn và chỉ mang tính chất tham khảo. Vui lòng tham vấn ý kiến Bác sĩ hoặc Dược sĩ chuyên môn trước khi sử dụng bất kỳ loại thuốc nào.
              </p>
            </div>

            {/* Recommendations list */}
            <div className="space-y-4">
              {recommendations.map((drug, idx) => (
                <DrugCard key={drug.id || idx} drug={drug} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrugSuggestion;
