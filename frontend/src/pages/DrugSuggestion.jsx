import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import RecommendationCard from '../components/symptoms/RecommendationCard';
import MedicalAlert from '../components/common/MedicalAlert';
import EmptyState from '../components/common/EmptyState';
import PageHeader from '../components/common/PageHeader';

const DrugSuggestion = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('drugSuggestions');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        
        // Handle both raw array and wrapper object structures
        const drugs = data.recommendations || (Array.isArray(data) ? data : []);
        setRecommendations(drugs);
        setMeta(data.meta || null);
      } catch (err) {
        console.error('Lỗi khi parse kết quả gợi ý:', err);
      }
    }
    setLoading(false);
  }, []);

  // Helper check for critical warning symptoms
  const hasDangerousSymptom = meta?.symptoms?.some((s) => {
    const name = s.toLowerCase();
    return name.includes('khó thở') || name.includes('đau ngực') || name.includes('sốt cao') || name.includes('ngất');
  }) || false;

  return (
    <div className="relative min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans">
      {/* Background Glowing Orbs */}
      <div className="bg-glow-orb w-[400px] h-[400px] bg-teal-500/5 top-[20%] left-[-10%]"></div>
      <div className="bg-glow-orb w-[500px] h-[500px] bg-sky-500/5 bottom-[-10%] right-[-10%]"></div>

      <Navbar />

      <div className="relative z-10 flex-grow container mx-auto px-6 py-10 max-w-3xl space-y-6">
        
        {/* Page Header */}
        <PageHeader
          title="💡 Gợi Ý Thuốc Tham Khảo"
          description="Kết quả phân tích từ trợ lý AI dựa trên triệu chứng của bạn, đã đối chiếu loại trừ các thuốc chống chỉ định và dị ứng."
          action={
            <button
              onClick={() => navigate('/symptoms')}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 text-slate-300 bg-slate-900/50 hover:bg-slate-800 transition-all flex items-center gap-1.5 focus:outline-none"
            >
              &larr; Thay đổi triệu chứng
            </button>
          }
        />

        {/* Filters Summary Panel */}
        {meta && (
          <div className="glass-card p-4 rounded-xl border-white/5 space-y-2">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Thông số hồ sơ phân tích</h4>
            <div className="grid gap-2 sm:grid-cols-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Triệu chứng:</span>
                <span className="text-slate-200 font-semibold">{meta.symptoms?.join(', ') || 'Chưa rõ'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Đã đối chiếu dị ứng:</span>
                <span className="text-teal-400 font-semibold">
                  {meta.allergiesCount > 0 ? `${meta.allergiesCount} hoạt chất` : 'Đã đối chiếu (Trống)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Đã đối chiếu bệnh nền:</span>
                <span className="text-teal-400 font-semibold">
                  {meta.historyCount > 0 ? `${meta.historyCount} bệnh lý` : 'Đã đối chiếu (Trống)'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Warning Alerts */}
        {hasDangerousSymptom && (
          <MedicalAlert type="danger" title="Cảnh báo triệu chứng nguy hiểm">
            Bạn đang có triệu chứng nghiêm trọng (khó thở, đau ngực, sốt cao...). Trợ lý AI khuyên bạn nên thăm khám bác sĩ hoặc liên hệ cơ sở y tế khẩn cấp ngay lập tức, không nên tự điều trị tại nhà.
          </MedicalAlert>
        )}

        {/* Main Disclaimer Banner */}
        <MedicalAlert type="warning" title="Khuyến cáo quan trọng">
          Thông tin gợi ý dưới đây chỉ mang tính chất tham khảo ban đầu, không thay thế cho chỉ định điều trị và tư vấn chuyên môn của bác sĩ. Vui lòng tham khảo ý kiến nhân viên y tế trước khi dùng bất kỳ thuốc nào.
        </MedicalAlert>

        {/* Results Area */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 font-medium">Đang tải gợi ý thuốc tham khảo...</div>
        ) : recommendations.length === 0 ? (
          <EmptyState
            title="Không tìm thấy gợi ý phù hợp"
            description="Dựa trên các triệu chứng và giới hạn bệnh lý/dị ứng của bạn, hệ thống AI không tìm thấy loại thuốc tham khảo nào phù hợp hoặc an toàn tuyệt đối."
            action={
              <button
                onClick={() => navigate('/symptoms')}
                className="btn-gradient px-6 py-3 rounded-xl text-sm font-semibold shadow-lg"
              >
                Nhập triệu chứng khác
              </button>
            }
          />
        ) : (
          <div className="space-y-4">
            {recommendations.map((drug, idx) => (
              <RecommendationCard key={drug.id || idx} drug={drug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DrugSuggestion;
