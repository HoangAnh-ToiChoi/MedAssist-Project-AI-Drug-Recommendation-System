import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const SpecialtySelector = ({ specialty = '', onChange }) => {
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchSpecialties = async () => {
      try {
        const response = await api.get('/specialties');
        const data = response.data?.data || response.data || [];

        if (!isMounted) {
          return;
        }

        const sortedSpecialties = [...data].sort((left, right) => {
          const leftOrder = Number.isFinite(left?.displayOrder) ? left.displayOrder : Number.MAX_SAFE_INTEGER;
          const rightOrder = Number.isFinite(right?.displayOrder) ? right.displayOrder : Number.MAX_SAFE_INTEGER;

          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }

          return String(left?.name || '').localeCompare(String(right?.name || ''));
        });

        setSpecialties(sortedSpecialties);
        setError('');
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError('Không thể tải danh sách chuyên khoa. Vui lòng thử lại sau.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSpecialties();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
        Chuyên khoa
      </label>

      <div className="space-y-2">
        <select
          value={specialty}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading || specialties.length === 0}
          className="input-field text-sm py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">{loading ? 'Đang tải chuyên khoa...' : 'Chọn chuyên khoa để xem triệu chứng'}</option>
          {specialties.map((item) => (
            <option key={item.id || item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>

        {error ? (
          <div className="text-rose-400 text-sm border border-rose-500/10 bg-rose-500/5 rounded-xl px-3 py-2.5">
            {error}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Chọn đúng chuyên khoa để hệ thống chỉ hiển thị nhóm triệu chứng liên quan và đưa ra gợi ý phù hợp hơn.
          </p>
        )}
      </div>
    </div>
  );
};

export default SpecialtySelector;
