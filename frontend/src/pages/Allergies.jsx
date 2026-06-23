import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Button from '../components/common/Button';
import PageHeader from '../components/common/PageHeader';
import AllergyCard from '../components/allergy/AllergyCard';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const Allergies = () => {
  const toast = useToast();
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ drugName: '', drugId: '', severity: 'medium', reaction: '' });
  const [submitting, setSubmitting] = useState(false);

  // Autocomplete states
  const [drugSuggestions, setDrugSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Confirm delete states
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteAllergyId, setDeleteAllergyId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAllergies = async () => {
    try {
      const res = await api.get('/allergies');
      setAllergies(res.data.data || res.data || []);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu dị ứng thuốc');
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

  // Open confirm modal instead of browser confirm
  const handleDeleteClick = (id) => {
    setDeleteAllergyId(id);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteAllergyId) return;
    setDeleting(true);
    try {
      await api.delete(`/allergies/${deleteAllergyId}`);
      setConfirmDeleteOpen(false);
      setDeleteAllergyId(null);
      toast.success('Đã xóa ghi nhận dị ứng thành công.');
      fetchAllergies();
    } catch (err) {
      toast.error('Xóa dị ứng thất bại. Vui lòng thử lại sau.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.drugName.trim()) {
      toast.warning('Vui lòng nhập tên thuốc hoặc hoạt chất.');
      return;
    }
    setSubmitting(true);

    const payload = {
      drugId: formData.drugId || undefined,
      drugName: formData.drugId ? undefined : formData.drugName,
      reactionType: formData.reaction,
      // Map frontend values to backend schema
      severity: formData.severity === 'medium' ? 'moderate' : formData.severity,
    };

    try {
      if (editingId) {
        await api.put(`/allergies/${editingId}`, payload);
        toast.success('Cập nhật thông tin dị ứng thành công.');
      } else {
        await api.post('/allergies', payload);
        toast.success('Khai báo dị ứng mới thành công.');
      }
      setModalOpen(false);
      fetchAllergies();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Lưu dị ứng thất bại';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0B0F19] text-slate-100 font-sans overflow-hidden">
      {/* Background Orbs */}
      <div className="bg-glow-orb w-[400px] h-[400px] bg-teal-500/5 top-[20%] left-[-10%]"></div>
      <div className="bg-glow-orb w-[500px] h-[500px] bg-sky-500/5 bottom-[-10%] right-[-10%]"></div>

      <Navbar />

      <div className="relative z-10 container mx-auto px-6 py-8 max-w-6xl space-y-6">
        
        {/* Page Header */}
        <PageHeader 
          title="⚠️ Dị Ứng Thuốc" 
          description="Khai báo hoạt chất hoặc tên thuốc thương mại bạn từng bị dị ứng để trợ lý AI tự động nhận biết, loại bỏ thuốc đó và cảnh báo các nguy cơ tương tác thuốc chéo có hại."
          action={
            <Button onClick={handleAdd} className="btn-gradient px-5 py-2 rounded-xl">
              + Khai báo dị ứng
            </Button>
          }
        />

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        {/* Allergy Cards Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 font-medium">Đang tải hồ sơ dị ứng...</div>
        ) : allergies.length === 0 ? (
          <EmptyState
            title="Chưa khai báo dị ứng thuốc"
            description="Hồ sơ dị ứng trống. Hãy thêm các hoạt chất hoặc tên thuốc bạn từng dị ứng để được hệ thống trợ lý bảo vệ."
            action={
              <Button onClick={handleAdd} className="btn-gradient px-5 py-2 rounded-xl">
                Khai báo dị ứng đầu tiên
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allergies.map((item) => (
              <AllergyCard 
                key={item.id} 
                allergy={item} 
                onEdit={handleEdit} 
                onDelete={handleDeleteClick} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal thêm/sửa dị ứng */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Sửa dị ứng' : 'Thêm dị ứng thuốc'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative mb-4">
            <Input
              label="Tên thuốc / Hoạt chất"
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
              placeholder="Nhập và chọn ví dụ: Paracetamol, Ibuprofen..."
              required
              autoComplete="off"
            />
            {showSuggestions && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto backdrop-blur-md">
                {suggestionsLoading ? (
                  <div className="p-3 text-xs text-slate-400">Đang tìm kiếm...</div>
                ) : drugSuggestions.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400">
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
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-teal-500/10 transition-colors flex flex-col border-b border-slate-800 last:border-0"
                    >
                      <span className="font-semibold text-slate-200">{drug.name}</span>
                      {drug.generic_name && (
                        <span className="text-xs text-slate-400 mt-0.5">Hoạt chất: {drug.generic_name}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mức độ phản ứng</label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-transparent"
            >
              <option value="mild" className="bg-[#111827] text-slate-100">Nhẹ</option>
              <option value="medium" className="bg-[#111827] text-slate-100">Vừa (Trung bình)</option>
              <option value="severe" className="bg-[#111827] text-slate-100">Nặng</option>
              <option value="mild_not_sure" className="bg-[#111827] text-slate-100">Không chắc chắn</option>
            </select>
          </div>

          <Input
            label="Phản ứng gặp phải (triệu chứng)"
            value={formData.reaction}
            onChange={(e) => setFormData({ ...formData, reaction: e.target.value })}
            placeholder="Ví dụ: nổi mề đay, sưng phù, khó thở..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="submit" loading={submitting}>Lưu hồ sơ</Button>
          </div>
        </form>
      </Modal>

      {/* Custom Confirm Modal for deletion */}
      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa dị ứng thuốc"
        message="Hành động này sẽ xóa ghi nhận dị ứng này khỏi tài khoản của bạn. Trợ lý AI sẽ không thể đối chiếu cảnh báo chống chỉ định cho hoạt chất này nữa."
        confirmText="Xóa dị ứng"
        cancelText="Hủy bỏ"
        loading={deleting}
      />
    </div>
  );
};

export default Allergies;