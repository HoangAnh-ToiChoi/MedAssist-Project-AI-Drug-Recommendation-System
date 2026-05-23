import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import SymptomSelector from '../components/symptoms/SymptomSelector';
import Button from '../components/common/Button';
import api from '../services/api';

const SymptomInput = () => {
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAdd = (symptom) => {
    if (!selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const handleRemove = (symptom) => {
    setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
  };

  const handleSubmit = async () => {
    if (selectedSymptoms.length === 0) {
      setError('Vui lòng chọn ít nhất một triệu chứng');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Gọi API /symptoms/check với danh sách triệu chứng
      const response = await api.post('/symptoms/check', { symptoms: selectedSymptoms });
      // Lưu kết quả vào localStorage để trang DrugSuggestion sử dụng
      localStorage.setItem('drugSuggestions', JSON.stringify(response.data.data || response.data));
      navigate('/suggestions');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể lấy gợi ý thuốc. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0B0B0C] text-gray-100 flex flex-col font-sans">
      {/* Background Glowing Orbs */}
      <div className="bg-glow-orb w-[400px] h-[400px] bg-[#00F0FF]/10 top-[20%] left-[-10%]"></div>
      <div className="bg-glow-orb w-[400px] h-[400px] bg-[#8A2BE2]/10 bottom-[-10%] right-[-10%]"></div>

      <Navbar />

      <div className="relative z-10 flex-grow container mx-auto px-6 py-12 max-w-3xl space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Kiểm Tra <span className="text-gradient-neon">Triệu Chứng</span>
          </h1>
          <p className="text-sm text-gray-400">
            Chọn hoặc tìm kiếm các triệu chứng hiện tại của bạn để nhận chẩn đoán và gợi ý thuốc an toàn từ trợ lý AI.
          </p>
        </div>

        {/* Diagnostic Form - Glassmorphism Card */}
        <div className="glass-card p-6 md:p-8 rounded-2xl border-white/5 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-sm font-medium text-center">
              {error}
            </div>
          )}

          <SymptomSelector
            selected={selectedSymptoms}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />

          <div className="pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={selectedSymptoms.length === 0 || loading}
              className="btn-gradient w-full py-4 rounded-xl font-bold tracking-wide shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              loading={loading}
            >
              {loading ? 'Đang phân tích...' : 'Gợi ý phác đồ thuốc AI'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SymptomInput;
