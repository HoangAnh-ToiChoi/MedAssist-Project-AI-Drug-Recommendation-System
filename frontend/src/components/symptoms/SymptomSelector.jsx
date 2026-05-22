import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const SymptomSelector = ({ selected, onAdd, onRemove }) => {
  const [symptoms, setSymptoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Gọi API lấy danh sách triệu chứng
  useEffect(() => {
    const fetchSymptoms = async () => {
      try {
        const response = await api.get('/symptoms');
        // API trả về dạng: { success: true, data: [...] } hoặc trực tiếp mảng
        const data = response.data?.data || response.data || [];
        setSymptoms(data);
      } catch (err) {
        console.error(err);
        setError('Không thể tải danh sách triệu chứng. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    fetchSymptoms();
  }, []);

  // Lọc theo từ khóa tìm kiếm và loại bỏ triệu chứng đã chọn
  const filtered = symptoms.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) && !selected.includes(s.name)
  );

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Đang tải triệu chứng...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center py-4">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Ô tìm kiếm */}
      <div className="relative">
        <input
          type="text"
          placeholder="Tìm triệu chứng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Danh sách triệu chứng gợi ý */}
      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
        {filtered.map((symptom) => (
          <button
            key={symptom.id}
            onClick={() => {
              onAdd(symptom.name);
              setSearch('');
            }}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-secondary hover:text-white transition-colors"
          >
            + {symptom.name}
          </button>
        ))}
        {filtered.length === 0 && search && (
          <button
            onClick={() => {
              onAdd(search);
              setSearch('');
            }}
            className="px-3 py-1 bg-blue-50 text-secondary border border-secondary rounded-full text-sm hover:bg-secondary hover:text-white"
          >
            + Thêm "{search}"
          </button>
        )}
      </div>

      {/* Triệu chứng đã chọn */}
      {selected.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Đã chọn ({selected.length}):</p>
          <div className="flex flex-wrap gap-2">
            {selected.map((symptom) => (
              <span
                key={symptom}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-full text-sm"
              >
                {symptom}
                <button onClick={() => onRemove(symptom)} className="hover:text-red-200">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SymptomSelector;