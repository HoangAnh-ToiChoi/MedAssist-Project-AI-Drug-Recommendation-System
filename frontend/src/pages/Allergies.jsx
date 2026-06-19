import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import api from '../services/api';

const Allergies = () => {
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ drugName: '', drugId: '', severity: 'medium', reaction: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [drugSuggestions, setDrugSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const fetchAllergies = async () => {
    try {
      const res = await api.get('/allergies');
      setAllergies(res.data.data || res.data || []);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllergies();
  }, []);

  const handleDrugNameChange = async (val) => {
    setFormData((prev) => ({ ...prev, drugName: val, drugId: '' }));
    if (!val.trim()) {
      setDrugSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSuggestionsLoading(true);
    setShowSuggestions(true);
    try {
      const res = await api.get(`/allergies/drugs?q=${encodeURIComponent(val)}`);
      setDrugSuggestions(res.data.data || res.data || []);
    } catch (err) {
      console.error('Không thể lấy gợi ý thuốc:', err);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ drugName: '', drugId: '', severity: 'medium', reaction: '' });
    setDrugSuggestions([]);
    setShowSuggestions(false);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      drugName: item.drug_name || item.drugName || '',
      drugId: item.drug_id || item.drugId || '',
      severity: item.severity === 'moderate' ? 'medium' : (item.severity || 'medium'),
      reaction: item.reaction_type || item.reaction || '',
    });
    setDrugSuggestions([]);
    setShowSuggestions(false);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa dị ứng này?')) return;
    try {
      await api.delete(`/allergies/${id}`);
      fetchAllergies();
    } catch (err) {
      alert('Xóa thất bại');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.drugName.trim()) {
      alert('Vui lòng nhập tên thuốc');
      return;
    }
    setSubmitting(true);

    const payload = {
      drugId: formData.drugId || undefined,
      drugName: formData.drugId ? undefined : formData.drugName,
      reactionType: formData.reaction,
      severity: formData.severity === 'medium' ? 'moderate' : formData.severity,
    };

    try {
      if (editingId) {
        await api.put(`/allergies/${editingId}`, payload);
      } else {
        await api.post('/allergies', payload);
      }
      setModalOpen(false);
      fetchAllergies();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Lưu thất bại';
      alert(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const severityBadge = (severity) => {
    switch (severity) {
      case 'severe': return <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full text-xs">Nặng</span>;
      case 'moderate':
      case 'medium': return <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full text-xs">Trung bình</span>;
      default: return <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full text-xs">Nhẹ</span>;
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0B0B0C] text-gray-100 font-sans overflow-hidden">
      <div className="bg-glow-orb w-[400px] h-[400px] bg-[#FF007F]/10 top-[20%] left-[-10%]"></div>
      <div className="bg-glow-orb w-[500px] h-[500px] bg-[#8A2BE2]/10 bottom-[-10%] right-[-10%]"></div>
      <Navbar />
      <div className="relative z-10 container mx-auto px-6 py-10 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold">⚠️ Dị Ứng Thuốc</h1>
          <Button onClick={handleAdd} className="btn-gradient px-5 py-2 rounded-xl">+ Thêm dị ứng</Button>
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4">{error}</div>}
        {loading ? (
          <div className="text-center py-10">Đang tải...</div>
        ) : allergies.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center">
            <p className="text-gray-400">Chưa có dị ứng thuốc nào. Hãy thêm để được cảnh báo khi gợi ý thuốc.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allergies.map((item) => (
              <div key={item.id} className="glass-card p-5 rounded-2xl border-white/5 hover:border-[#FF007F]/30 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-white">💊 {item.drug_name || item.drugName}</h3>
                    <div className="mt-1">{severityBadge(item.severity)}</div>
                    {(item.reaction_type || item.reaction) && <p className="text-xs text-gray-400 mt-2">📝 {item.reaction_type || item.reaction}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(item)} className="text-[#00F0FF] hover:text-white">✏️</button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300">🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Sửa dị ứng' : 'Thêm dị ứng thuốc'}>
        <form onSubmit={handleSubmit}>
          <div className="relative mb-4">
            <Input
              label="Tên thuốc"
              value={formData.drugName}
              onChange={(e) => handleDrugNameChange(e.target.value)}
              onFocus={() => {
                if (formData.drugName.trim()) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              required
              autoComplete="off"
            />
            {showSuggestions && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white text-black border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {suggestionsLoading ? (
                  <div className="p-3 text-xs text-gray-500">Đang tìm kiếm...</div>
                ) : drugSuggestions.length === 0 ? (
                  <div className="p-3 text-xs text-gray-500">
                    Không thấy thuốc khớp. Hệ thống sẽ tự nhận diện bằng AI khi bạn lưu.
                  </div>
                ) : (
                  drugSuggestions.map((drug) => (
                    <button
                      key={drug.id}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          drugName: drug.name,
                          drugId: drug.id,
                        }));
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex flex-col border-b border-gray-100 last:border-0"
                    >
                      <span className="font-semibold text-gray-800">{drug.name}</span>
                      {drug.generic_name && (
                        <span className="text-xs text-gray-500">Hoạt chất: {drug.generic_name}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-400 mb-1">Mức độ</label>
            <select value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })} className="input-field">
              <option value="mild">Nhẹ</option>
              <option value="medium">Trung bình</option>
              <option value="severe">Nặng</option>
            </select>
          </div>
          <Input label="Phản ứng (triệu chứng)" value={formData.reaction} onChange={(e) => setFormData({ ...formData, reaction: e.target.value })} placeholder="Ví dụ: nổi mề đay, khó thở..." />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="submit" loading={submitting}>Lưu</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Allergies;