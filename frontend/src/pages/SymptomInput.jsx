import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Button from '../components/common/Button';
import SpecialtySelector from '../components/symptoms/SpecialtySelector';
import SymptomSelector from '../components/symptoms/SymptomSelector';
import SelectedSymptoms from '../components/symptoms/SelectedSymptoms';
import MedicalAlert from '../components/common/MedicalAlert';
import api from '../services/api';

const SymptomInput = () => {
  const [specialty, setSpecialty] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [severity, setSeverity] = useState('medium'); // mild, medium, severe
  const [duration, setDuration] = useState('today'); // today, 2-3days, over1week
  
  const [allergiesCount, setAllergiesCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Load counts of allergies and histories for the filter preview panel
  useEffect(() => {
    const fetchProfileCounts = async () => {
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
        console.error('Lỗi khi tải thông số hồ sơ lọc:', err);
      }
    };
    fetchProfileCounts();
  }, []);

  const handleAdd = (symptom) => {
    if (!selectedSymptoms.includes(symptom)) {
      setError('');
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const handleRemove = (symptom) => {
    setError('');
    setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
  };

  const handleSpecialtyChange = (nextSpecialty) => {
    setError('');
    setSpecialty(nextSpecialty);
    setSelectedSymptoms([]);
  };

  const handleSubmit = async () => {
    if (!specialty) {
      setError('Vui lòng chọn chuyên khoa trước khi tiếp tục');
      return;
    }

    if (selectedSymptoms.length === 0) {
      setError('Vui lòng chọn ít nhất một triệu chứng');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/symptoms/check', { 
        specialty,
        symptoms: selectedSymptoms,
        severity,
        duration
      });
      
      // Store in localStorage for suggestion results page
      localStorage.setItem('drugSuggestions', JSON.stringify({
        ...(response.data.data || response.data),
        meta: {
          specialty,
          symptoms: selectedSymptoms,
          severity,
          duration,
          allergiesCount,
          historyCount
        }
      }));
      navigate('/suggestions');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể lấy gợi ý thuốc. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Helper check for critical warning symptoms
  const hasDangerousSymptom = selectedSymptoms.some((s) => {
    const name = s.toLowerCase();
    return name.includes('khó thở') || name.includes('đau ngực') || name.includes('sốt cao') || name.includes('ngất');
  });

  return (
    <div className="relative min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans">
      {/* Background Glowing Orbs */}
      <div className="bg-glow-orb w-[400px] h-[400px] bg-teal-500/5 top-[20%] left-[-10%]"></div>
      <div className="bg-glow-orb w-[400px] h-[400px] bg-sky-500/5 bottom-[-10%] right-[-10%]"></div>

      <Navbar />

      <div className="relative z-10 flex-grow container mx-auto px-6 py-10 max-w-3xl space-y-6">
        {/* Page Header */}
        <div className="space-y-1.5 pb-5 border-b border-slate-800">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Hỗ Trợ <span className="text-gradient-neon">Tìm Kiếm Thuốc</span>
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Chọn triệu chứng của bạn để nhận đề xuất hỗ trợ ban đầu và danh mục gợi ý thuốc tham khảo an toàn từ trợ lý AI.
          </p>
        </div>

        {/* Dynamic Warning Alert */}
        {hasDangerousSymptom && (
          <MedicalAlert type="warning" title="Khuyến cáo sức khỏe">
            Bạn đang chọn triệu chứng có nguy cơ cao (khó thở, đau ngực, sốt...). Vui lòng liên hệ cơ sở y tế gần nhất nếu triệu chứng nghiêm trọng hoặc kéo dài đột ngột.
          </MedicalAlert>
        )}

        {/* Input Form Card */}
        <div className="glass-card p-6 md:p-8 rounded-2xl border-white/5 space-y-6">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-sm font-medium text-center">
              {error}
            </div>
          )}

          <SpecialtySelector
            specialty={specialty}
            onChange={handleSpecialtyChange}
          />

          {/* Dynamic Symptom Selector component */}
          <SymptomSelector
            specialty={specialty}
            selected={selectedSymptoms}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />

          {/* Selected Symptoms list component */}
          <SelectedSymptoms 
            selected={selectedSymptoms} 
            onRemove={handleRemove} 
          />

          {/* Optional parameters section */}
          {selectedSymptoms.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-slate-800/40">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Mức độ triệu chứng</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="input-field text-sm py-2.5"
                >
                  <option value="mild">Nhẹ</option>
                  <option value="medium">Vừa (Trung bình)</option>
                  <option value="severe">Nặng</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian xuất hiện</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="input-field text-sm py-2.5"
                >
                  <option value="today">Hôm nay</option>
                  <option value="2-3days">2 - 3 ngày</option>
                  <option value="over1week">Trên 1 tuần</option>
                </select>
              </div>
            </div>
          )}

          {/* Active filters dashboard preview */}
          <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-4 flex justify-between items-center gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-300">🛡️ Tự động áp dụng bộ lọc an toàn</h4>
              <p className="text-[11px] text-slate-500">Hệ thống đối chiếu và loại bỏ thuốc trùng với hoạt chất dị ứng hoặc gây biến chứng bệnh lý.</p>
            </div>
            <div className="flex gap-3 text-right whitespace-nowrap">
              <div className="text-xs">
                <span className="block text-slate-500 font-bold uppercase tracking-wide text-[9px]">Dị ứng thuốc</span>
                <span className={allergiesCount > 0 ? 'text-teal-400 font-semibold' : 'text-slate-400'}>
                  {allergiesCount > 0 ? `Đã nạp ${allergiesCount} mục` : 'Trống'}
                </span>
              </div>
              <div className="text-xs">
                <span className="block text-slate-500 font-bold uppercase tracking-wide text-[9px]">Tiền sử bệnh</span>
                <span className={historyCount > 0 ? 'text-teal-400 font-semibold' : 'text-slate-400'}>
                  {historyCount > 0 ? `Đã nạp ${historyCount} mục` : 'Trống'}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={!specialty || selectedSymptoms.length === 0 || loading}
              className="btn-gradient w-full py-4 rounded-xl font-bold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
              loading={loading}
            >
              {loading ? 'Đang phân tích dữ liệu...' : 'Xem gợi ý thuốc tham khảo'}
            </Button>
            {(!specialty || selectedSymptoms.length === 0) && (
              <p className="text-center text-[11px] text-slate-500 mt-2">
                {!specialty ? 'Chọn chuyên khoa trước khi duyệt triệu chứng' : 'Chọn ít nhất 1 triệu chứng để tiếp tục'}
              </p>
            )}
          </div>
        </div>
        
        {/* Healthcare Disclaimer */}
        <p className="text-[11px] text-slate-500 text-center leading-relaxed max-w-xl mx-auto">
          * Khuyến cáo: Các gợi ý thuốc của trợ lý AI chỉ mang tính chất hỗ trợ ban đầu và tham khảo y khoa. Không tự ý dùng thuốc thay thế cho chẩn đoán và chỉ định điều trị của bác sĩ chuyên môn.
        </p>
      </div>
    </div>
  );
};

export default SymptomInput;
