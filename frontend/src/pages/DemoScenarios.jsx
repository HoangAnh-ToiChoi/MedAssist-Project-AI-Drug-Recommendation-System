import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';

const DEMO_SCENARIOS = [
  {
    id: 'respiratory-safe',
    title: 'Demo Hô hấp an toàn',
    summary: 'Ho, sốt nhẹ, ưu tiên explanation grounded và danh sách thuốc đã qua lọc an toàn.',
    data: {
      id: '11111111-1111-4111-8111-111111111111',
      specialty: 'ho_hap',
      matchedSymptoms: ['ho', 'sot'],
      topDiseases: [
        { code: 'viem_phe_quan_cap', displayName: 'Viêm phế quản cấp', icd10Code: 'J20', score: 0.87 },
        { code: 'cum_mua', displayName: 'Cúm mùa', icd10Code: 'J10', score: 0.74 },
      ],
      recommendations: [
        {
          name: 'Paracetamol 500mg',
          generic_name: 'Paracetamol',
          confidence: 0.92,
          reason: 'Phù hợp với sốt và đau nhức, không xung đột với bộ lọc dị ứng hiện tại.',
          dosage: 'Theo hướng dẫn bác sĩ hoặc dược sĩ.',
          contraindications: 'Thận trọng nếu có bệnh gan nặng.',
        },
        {
          name: 'Salbutamol khí dung',
          generic_name: 'Salbutamol',
          confidence: 0.81,
          reason: 'Được giữ lại để hỗ trợ khó thở nhẹ sau khi qua bước lọc an toàn.',
          dosage: 'Theo chỉ định chuyên môn.',
          contraindications: 'Thận trọng nếu có bệnh tim mạch.',
        },
      ],
      dangerAlert: '',
      llmExplanation: {
        enabled: true,
        status: 'success',
        provider: 'demo-grounded',
        summary: 'Kết quả đang được giới hạn trong chuyên khoa Hô hấp với 2 triệu chứng đã đối chiếu.',
        explanation: 'Hệ thống ưu tiên các bệnh hô hấp có khả năng cao nhất, sau đó chỉ giữ lại những thuốc còn phù hợp sau bước lọc dị ứng và chống chỉ định. Explanation này chỉ diễn giải từ dữ liệu grounded đã được backend phê duyệt.',
        safetyNote: 'Thông tin chỉ mang tính tham khảo và không thay thế đánh giá của bác sĩ.',
        quality: {
          status: 'pass',
          score: 0.96,
          grounded_entity_count: 3,
          grounded_entity_total: 4,
          disclaimer_present: true,
          danger_alert_considered: true,
          notes: [],
        },
      },
      meta: {
        recommendationId: '11111111-1111-4111-8111-111111111111',
        specialty: 'ho_hap',
        symptoms: ['Ho', 'Sốt'],
        severity: 'medium',
        duration: 'today',
        allergiesCount: 1,
        historyCount: 1,
      },
    },
  },
  {
    id: 'digestive-warning',
    title: 'Demo Tiêu hóa có cảnh báo',
    summary: 'Đau bụng, buồn nôn, có cảnh báo cần đi khám nếu dấu hiệu nặng lên.',
    data: {
      id: '22222222-2222-4222-8222-222222222222',
      specialty: 'tieu_hoa',
      matchedSymptoms: ['dau_bung', 'buon_non'],
      topDiseases: [
        { code: 'trao_nguoc_da_day', displayName: 'Trào ngược dạ dày thực quản', icd10Code: 'K21.9', score: 0.83 },
        { code: 'viem_da_day', displayName: 'Viêm dạ dày', icd10Code: 'K29.7', score: 0.71 },
      ],
      recommendations: [
        {
          name: 'Omeprazole 20mg',
          generic_name: 'Omeprazole',
          confidence: 0.89,
          reason: 'Được ưu tiên cho nhóm triệu chứng tiêu hóa sau khi loại bỏ các lựa chọn rủi ro cao hơn.',
          dosage: 'Theo hướng dẫn chuyên môn.',
          contraindications: 'Thận trọng nếu đang dùng thuốc cần môi trường acid để hấp thu.',
        },
      ],
      dangerAlert: 'Nếu đau bụng tăng nhanh, nôn kéo dài hoặc có dấu hiệu mất nước, cần liên hệ cơ sở y tế.',
      llmExplanation: {
        enabled: true,
        status: 'success',
        provider: 'demo-grounded',
        summary: 'Kết quả được thu hẹp trong chuyên khoa Tiêu hóa với cảnh báo an toàn đang bật.',
        explanation: 'Thuốc còn lại sau bộ lọc là thuốc có mức phù hợp cao nhất trong phạm vi bệnh tiêu hóa đang được cân nhắc. Hệ thống không thêm thuốc mới và vẫn giữ nguyên cảnh báo cần đi khám khi triệu chứng xấu đi.',
        safetyNote: 'Thông tin chỉ mang tính tham khảo, không tự ý đổi thuốc hoặc trì hoãn thăm khám.',
        quality: {
          status: 'pass',
          score: 0.94,
          grounded_entity_count: 3,
          grounded_entity_total: 3,
          disclaimer_present: true,
          danger_alert_considered: true,
          notes: [],
        },
      },
      meta: {
        recommendationId: '22222222-2222-4222-8222-222222222222',
        specialty: 'tieu_hoa',
        symptoms: ['Đau bụng', 'Buồn nôn'],
        severity: 'medium',
        duration: '2-3days',
        allergiesCount: 0,
        historyCount: 1,
      },
    },
  },
];

function DemoScenarios() {
  const navigate = useNavigate();

  const handleLoadScenario = (scenario) => {
    localStorage.setItem('drugSuggestions', JSON.stringify(scenario.data));
    localStorage.setItem('lastRecommendationId', scenario.data.id || scenario.data.meta?.recommendationId || '');
    navigate('/suggestions');
  };

  return (
    <div className="relative min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans">
      <div className="bg-glow-orb w-[420px] h-[420px] bg-teal-500/5 top-[10%] left-[-12%]" />
      <div className="bg-glow-orb w-[420px] h-[420px] bg-sky-500/5 bottom-[-10%] right-[-12%]" />
      <Navbar />

      <div className="relative z-10 container mx-auto max-w-4xl px-6 py-10 space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-300/80">Demo Mode</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Kịch bản quay video nhanh</h1>
          <p className="max-w-2xl text-sm text-slate-400 leading-relaxed">
            Trang này nạp sẵn dữ liệu grounded vào `localStorage` để quay video UI recommendation nhanh và ổn định,
            không phụ thuộc dữ liệu live hoặc provider response tại thời điểm quay.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {DEMO_SCENARIOS.map((scenario) => (
            <div key={scenario.id} className="glass-card rounded-2xl border-white/5 p-6 space-y-4">
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-slate-100">{scenario.title}</h2>
                <p className="text-sm text-slate-400 leading-relaxed">{scenario.summary}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-300 space-y-1">
                <p><span className="text-slate-500">Chuyên khoa:</span> {scenario.data.meta.specialty}</p>
                <p><span className="text-slate-500">Triệu chứng:</span> {scenario.data.meta.symptoms.join(', ')}</p>
                <p><span className="text-slate-500">Top disease:</span> {scenario.data.topDiseases.map((d) => d.displayName).join(', ')}</p>
                <p><span className="text-slate-500">Thuốc:</span> {scenario.data.recommendations.map((d) => d.name).join(', ')}</p>
              </div>

              <button
                type="button"
                onClick={() => handleLoadScenario(scenario)}
                className="btn-gradient w-full rounded-xl px-4 py-3 text-sm font-semibold shadow-lg"
              >
                Nạp kịch bản này
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DemoScenarios;
