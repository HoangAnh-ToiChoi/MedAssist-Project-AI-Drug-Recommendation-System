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
    setSelectedSymptoms([...selectedSymptoms, symptom]);
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
      // Giả sử backend trả về dữ liệu có cấu trúc: { recommendations: [...] }
      // Lưu kết quả vào localStorage để trang DrugSuggestion sử dụng
      localStorage.setItem('drugSuggestions', JSON.stringify(response.data));
      navigate('/suggestions');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể lấy gợi ý thuốc. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-primary mb-6">Kiểm tra triệu chứng</h1>
        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}
        <SymptomSelector
          selected={selectedSymptoms}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
        <div className="mt-8">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={selectedSymptoms.length === 0 || loading}
            className="w-full md:w-auto"
          >
            {loading ? 'Đang xử lý...' : 'Gợi ý thuốc'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SymptomInput;