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

  if (loading) {
    return (
      <div>
        <Navbar />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-primary mb-6">Kết quả gợi ý thuốc</h1>
        {recommendations.length === 0 ? (
          <EmptyState
            title="Chưa có dữ liệu gợi ý"
            description="Vui lòng quay lại màn hình nhập triệu chứng và chọn triệu chứng để nhận gợi ý."
            action={
              <button
                onClick={() => navigate('/symptoms')}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-600"
              >
                Nhập triệu chứng
              </button>
            }
          />
        ) : (
          <div className="space-y-4">
            {recommendations.map((drug, idx) => (
              <DrugCard key={drug.id || idx} drug={drug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DrugSuggestion;