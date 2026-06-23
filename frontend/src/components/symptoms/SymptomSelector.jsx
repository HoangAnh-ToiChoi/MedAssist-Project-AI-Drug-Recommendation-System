import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import SymptomChip from './SymptomChip';

const CATEGORY_MAP = {
  'Toàn thân': ['sot', 'met_moi', 'sut_can', 'chong_mat', 'mat_ngu', 'sung_phu', 'roi_loan_tieu_tien'],
  'Hô hấp': ['ho', 'ho_co_dom', 'chay_mui', 'kho_tho'],
  'Tiêu hóa': ['buon_non', 'tieu_chay', 'tao_bon', 'dau_bung', 'an_khong_ngon'],
  'Đau nhức': ['dau_dau', 'dau_hong', 'dau_khop', 'dau_lung', 'dau_nguc'],
  'Da liễu': ['phat_ban', 'ngua', 'noi_mu', 'noi_mun']
};

const SymptomSelector = ({ specialty = '', selected = [], onAdd, onRemove }) => {
  const [symptoms, setSymptoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!specialty) {
      setSymptoms([]);
      setLoading(false);
      setError('');
      setSearch('');
      return;
    }

    let isMounted = true;

    const fetchSymptoms = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get(`/specialties/${encodeURIComponent(specialty)}/symptoms`);
        const data = response.data?.data || response.data || [];

        if (isMounted) {
          setSymptoms(data);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setSymptoms([]);
          setError('Không thể tải danh sách triệu chứng theo chuyên khoa. Vui lòng thử lại sau.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSymptoms();

    return () => {
      isMounted = false;
    };
  }, [specialty]);

  const getSymptomCategory = (symptom) => {
    const code = String(symptom?.code || '').toLowerCase();
    for (const [category, codes] of Object.entries(CATEGORY_MAP)) {
      if (codes.includes(code)) return category;
    }
    return 'Khác';
  };

  const handleChipClick = (symptomName) => {
    if (selected.includes(symptomName)) {
      onRemove(symptomName);
    } else {
      onAdd(symptomName);
    }
  };

  // Filter symptoms based on search query
  const filteredSymptoms = symptoms.filter((s) => {
    if (!s || !s.name) return false;
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  if (!specialty) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
            Tìm kiếm triệu chứng nhanh
          </label>
        </div>
        <div className="border border-slate-800 bg-slate-950/30 rounded-xl px-4 py-5 text-sm text-slate-400">
          Chọn chuyên khoa trước để hệ thống hiển thị danh sách triệu chứng phù hợp.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-3">
        <svg className="animate-spin h-8 w-8 text-teal-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm text-slate-500 font-medium">Đang tải danh mục triệu chứng theo chuyên khoa...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-rose-400 text-center py-6 border border-rose-500/10 bg-rose-500/5 rounded-xl text-sm font-medium">
        {error}
      </div>
    );
  }

  // Group symptoms
  const grouped = {};
  filteredSymptoms.forEach((symptom) => {
    const cat = getSymptomCategory(symptom);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(symptom);
  });

  // Category order
  const categoryOrder = ['Toàn thân', 'Hô hấp', 'Tiêu hóa', 'Đau nhức', 'Da liễu', 'Khác'];

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Tìm kiếm triệu chứng nhanh</label>
        <div className="relative">
          <input
            type="text"
            placeholder="Ví dụ: sốt, đau đầu, ho, tiêu chảy..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 text-sm py-2.5"
          />
          <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {filteredSymptoms.length === 0 && (
        <div className="text-center py-6 border border-slate-800 bg-slate-950/30 rounded-xl text-sm text-slate-400">
          {symptoms.length === 0
            ? 'Chưa có triệu chứng nào cho chuyên khoa này.'
            : 'Không tìm thấy triệu chứng phù hợp với từ khóa bạn nhập.'}
        </div>
      )}

      {/* Grouped Lists */}
      <div className="space-y-5">
        {categoryOrder.map((category) => {
          const list = grouped[category] || [];
          if (list.length === 0) return null;

          return (
            <div key={category} className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-teal-500 rounded-full"></span>
                {category}
              </h4>
              <div className="flex flex-wrap gap-2">
                {list.map((symptom) => (
                  <SymptomChip
                    key={symptom.id || symptom.name}
                    name={symptom.name}
                    selected={selected.includes(symptom.name)}
                    onClick={() => handleChipClick(symptom.name)}
                    icon={
                      category === 'Toàn thân' ? '🌡️' :
                      category === 'Hô hấp' ? '🫁' :
                      category === 'Tiêu hóa' ? '🤢' :
                      category === 'Đau nhức' ? '🤕' :
                      category === 'Da liễu' ? '🩹' : '•'
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SymptomSelector;
