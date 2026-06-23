import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import RecommendationCard from '../components/symptoms/RecommendationCard';
import DiseaseCandidateCard from '../components/symptoms/DiseaseCandidateCard';
import RecommendationExplanationCard from '../components/symptoms/RecommendationExplanationCard';
import RecommendationChatCard from '../components/symptoms/RecommendationChatCard';
import MedicalAlert from '../components/common/MedicalAlert';
import EmptyState from '../components/common/EmptyState';
import PageHeader from '../components/common/PageHeader';

const SPECIALTY_LABELS = {
  tim_mach: 'Tim mạch',
  da_lieu: 'Da liễu',
  noi_tiet: 'Nội tiết',
  tieu_hoa: 'Tiêu hóa',
  huyet_hoc: 'Huyết học',
  benh_truyen_nhiem: 'Bệnh truyền nhiễm',
  than: 'Than',
  than_kinh: 'Thần kinh',
  ung_buou: 'Ung bướu',
  nhan_khoa: 'Nhãn khoa',
  chinh_hinh: 'Chỉnh hình',
  tai_mui_hong: 'Tai Mũi Họng',
  tam_than: 'Tâm thần',
  ho_hap: 'Hô hấp',
  thap_khop: 'Thấp khớp',
  tiet_nieu: 'Tiết niệu',
  cap_cuu: 'Cấp cứu',
  gia_dinh: 'Gia đình',
  noi_khoa: 'Nội khoa',
  nhi_khoa: 'Nhi khoa',
  san_phu_khoa: 'Sản phụ khoa',
  chan_doan_hinh_anh: 'Chẩn đoán hình ảnh',
  gay_me: 'Gây mê',
  giai_phau_benh: 'Giải phẫu bệnh',
};

const DrugSuggestion = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [topDiseases, setTopDiseases] = useState([]);
  const [matchedSymptoms, setMatchedSymptoms] = useState([]);
  const [dangerAlert, setDangerAlert] = useState('');
  const [llmExplanation, setLlmExplanation] = useState(null);
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
        setTopDiseases(data.topDiseases || data.top_diseases || []);
        setMatchedSymptoms(data.matchedSymptoms || data.matched_symptoms || []);
        setDangerAlert(data.dangerAlert || data.danger_alert || '');
        setLlmExplanation(data.llmExplanation || data.llm_explanation || null);
        setMeta(data.meta || null);
      } catch (err) {
        console.error('Lỗi khi parse kết quả gợi ý:', err);
      }
    }
    setLoading(false);
  }, []);

  // Helper check for critical warning symptoms
  const symptomSignals = matchedSymptoms.length > 0 ? matchedSymptoms : (meta?.symptoms || []);
  const hasDangerousSymptom = symptomSignals.some((s) => {
    const name = s.toLowerCase();
    return name.includes('khó thở') || name.includes('đau ngực') || name.includes('sốt cao') || name.includes('ngất');
  }) || false;
  const specialtyLabel = SPECIALTY_LABELS[meta?.specialty] || meta?.specialty || 'Chưa chọn';
  const hasChatbot = recommendations.length > 0;

  const scrollToChatbot = () => {
    const section = document.getElementById('grounded-chatbot');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
            <div className="grid gap-2 sm:grid-cols-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Chuyên khoa:</span>
                <span className="text-slate-200 font-semibold">{specialtyLabel}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Triệu chứng:</span>
                <span className="text-slate-200 font-semibold">{meta.symptoms?.join(', ') || 'Chưa rõ'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Triệu chứng khớp:</span>
                <span className="text-slate-200 font-semibold">
                  {matchedSymptoms.length > 0 ? matchedSymptoms.join(', ') : 'Chưa đối chiếu'}
                </span>
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

        {topDiseases.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Benh nghi ngo hang dau</h3>
                <p className="text-xs text-slate-400">
                  Hệ thống ưu tiên disease graph trong phạm vi chuyên khoa đã chọn.
                </p>
              </div>
              <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-[11px] font-semibold text-slate-300">
                {topDiseases.length} bệnh cân nhắc
              </span>
            </div>

            <div className="space-y-3">
              {topDiseases.map((disease, index) => (
                <DiseaseCandidateCard key={disease.id || disease.code || index} disease={disease} />
              ))}
            </div>
          </section>
        )}

        {hasChatbot && (
          <div className="glass-card rounded-2xl border border-teal-500/10 bg-teal-500/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-100">Chatbot giải thích kết quả đã sẵn sàng</h3>
                <p className="text-xs leading-relaxed text-slate-400">
                  Sau khi xem disease candidates và thuốc đã qua bộ lọc, bạn có thể hỏi thêm lý do gợi ý, cảnh báo an toàn hoặc thời điểm cần đi khám.
                </p>
              </div>
              <button
                type="button"
                onClick={scrollToChatbot}
                className="btn-gradient rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap"
              >
                Mở chatbot grounded
              </button>
            </div>
          </div>
        )}

        {/* Warning Alerts */}
        {(dangerAlert || hasDangerousSymptom) && (
          <MedicalAlert type="danger" title="Cảnh báo triệu chứng nguy hiểm">
            {dangerAlert || 'Bạn đang có triệu chứng nghiêm trọng (khó thở, đau ngực, sốt cao...). Trợ lý AI khuyên bạn nên thăm khám bác sĩ hoặc liên hệ cơ sở y tế khẩn cấp ngay lập tức, không nên tự điều trị tại nhà.'}
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
          <div className="space-y-4">
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
            {llmExplanation && (
              <RecommendationExplanationCard explanation={llmExplanation} />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-4">
              {recommendations.map((drug, idx) => (
                <RecommendationCard key={drug.id || idx} drug={drug} />
              ))}
            </div>
            {llmExplanation && (
              <RecommendationExplanationCard explanation={llmExplanation} />
            )}
            <RecommendationChatCard
              recommendationId={meta?.recommendationId || localStorage.getItem('lastRecommendationId') || JSON.parse(localStorage.getItem('drugSuggestions') || '{}')?.id || null}
              specialty={meta?.specialty || null}
              matchedSymptoms={matchedSymptoms}
              topDiseases={topDiseases}
              recommendations={recommendations}
              dangerAlert={dangerAlert}
              llmExplanation={llmExplanation}
            />
          </div>
        )}
      </div>

      {hasChatbot && (
        <button
          type="button"
          onClick={scrollToChatbot}
          className="fixed bottom-6 right-6 z-20 rounded-full border border-teal-400/30 bg-[#0F172A]/95 px-4 py-3 text-xs font-semibold text-teal-200 shadow-[0_20px_60px_rgba(45,212,191,0.18)] backdrop-blur transition hover:border-teal-300/50 hover:text-white"
        >
          Chatbot AI
        </button>
      )}
    </div>
  );
};

export default DrugSuggestion;
