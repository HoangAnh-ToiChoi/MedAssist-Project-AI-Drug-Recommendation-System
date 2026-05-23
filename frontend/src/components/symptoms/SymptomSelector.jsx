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
  const filtered = Array.isArray(symptoms)
    ? symptoms.filter(
        (s) => s && s.name && s.name.toLowerCase().includes(search.toLowerCase()) && !selected.includes(s.name)
      )
    : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-3">
        <svg className="animate-spin h-8 w-8 text-[#00F0FF]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm text-gray-500">Đang tải danh mục triệu chứng y khoa...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-center py-8 border border-red-500/20 bg-red-500/5 rounded-xl font-medium">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ô tìm kiếm */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Tìm kiếm triệu chứng</label>
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm ví dụ: đau đầu, ho, sốt, sổ mũi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
          <svg className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Danh sách triệu chứng gợi ý */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {search ? 'Kết quả tìm kiếm' : 'Triệu chứng phổ biến'}
        </label>
        <div className="flex flex-wrap gap-2.5 max-h-48 overflow-y-auto p-1.5 bg-black/30 border border-white/5 rounded-xl">
          {filtered.slice(0, 20).map((symptom) => (
            <button
              key={symptom?.id || symptom?.name}
              onClick={() => {
                if (symptom?.name) {
                  onAdd(symptom.name);
                  setSearch('');
                }
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/5 text-gray-300 hover:border-[#00F0FF]/40 hover:bg-[#00F0FF]/5 hover:text-[#00F0FF] hover:shadow-[0_0_10px_rgba(0,240,255,0.1)] transition-all duration-300 active:scale-95"
            >
              + {symptom?.name || ''}
            </button>
          ))}

          {filtered.length === 0 && search && (
            <button
              onClick={() => {
                onAdd(search);
                setSearch('');
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-[#00F0FF] hover:bg-[#00F0FF]/25 hover:border-[#00F0FF] transition-all duration-300"
            >
              + Thêm mới "{search}"
            </button>
          )}

          {filtered.length === 0 && !search && (
            <span className="text-xs text-gray-500 py-3 px-2 w-full text-center">Đã chọn hết triệu chứng trong danh sách phổ biến</span>
          )}
        </div>
      </div>

      {/* Triệu chứng đã chọn */}
      {selected.length > 0 && (
        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Triệu chứng đã chọn ({selected.length})
          </p>
          <div className="flex flex-wrap gap-2.5 p-3 bg-white/5 border border-white/5 rounded-xl">
            {selected.map((symptom) => (
              <span
                key={symptom}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#00F0FF]/20 to-[#8A2BE2]/20 border border-[#00F0FF]/30 text-white shadow-[0_0_10px_rgba(0,240,255,0.05)]"
              >
                💊 {symptom}
                <button
                  onClick={() => onRemove(symptom)}
                  className="w-4 h-4 rounded-full flex items-center justify-center bg-black/40 text-gray-400 hover:text-red-400 hover:bg-black/80 transition-colors"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
