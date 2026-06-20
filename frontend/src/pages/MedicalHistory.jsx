import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Button from '../components/common/Button';
import PageHeader from '../components/common/PageHeader';
import MedicalRecordCard from '../components/history/MedicalRecordCard';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const MedicalHistory = () => {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ diseaseName: '', status: 'active', year: '', note: '' });
  const [submitting, setSubmitting] = useState(false);

  // Confirm delete states
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const toFormData = (item) => ({
    diseaseName: item.condition || '',
    status: item.status || 'active',
    year: item.diagnosedAt ? new Date(item.diagnosedAt).getFullYear().toString() : '',
    note: item.notes || '',
  });

  const toApiPayload = () => ({
    condition: formData.diseaseName.trim(),
    status: formData.status,
    diagnosedAt: formData.year ? `${formData.year}-01-01` : null,
    notes: formData.note?.trim() || null,
  });

  const fetchHistory = async () => {
    try {
      const res = await api.get('/history');
      setRecords(res.data.data || res.data || []);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu tiền sử bệnh lý');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ diseaseName: '', status: 'active', year: '', note: '' });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData(toFormData(item));
    setModalOpen(true);
  };

  // Open confirm modal instead of browser confirm
  const handleDeleteClick = (id) => {
    setDeleteRecordId(id);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRecordId) return;
    setDeleting(true);
    try {
      await api.delete(`/history/${deleteRecordId}`);
      setConfirmDeleteOpen(false);
      setDeleteRecordId(null);
      toast.success('Đã xóa ghi nhận bệnh nền thành công.');
      fetchHistory();
    } catch (err) {
      toast.error('Xóa thất bại. Vui lòng thử lại sau.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.diseaseName.trim()) {
      toast.warning('Vui lòng nhập tên bệnh.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/history/${editingId}`, toApiPayload());
        toast.success('Cập nhật thông tin bệnh lý thành công.');
      } else {
        await api.post('/history', toApiPayload());
        toast.success('Thêm ghi nhận bệnh nền thành công.');
      }
      setModalOpen(false);
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lưu tiền sử thất bại');
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
          title="📋 Tiền Sử Bệnh Lý" 
          description="Khai báo các bệnh nền như tiểu đường, cao huyết áp, hen suyễn, suy gan, suy thận... để hệ thống đối chiếu cảnh báo chống chỉ định và loại bỏ thuốc gợi ý không phù hợp."
          action={
            <Button onClick={handleAdd} className="btn-gradient px-5 py-2 rounded-xl">
              + Thêm bệnh nền
            </Button>
          }
        />

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        {/* Records Area */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 font-medium">Đang tải hồ sơ bệnh lý...</div>
        ) : records.length === 0 ? (
          <EmptyState
            title="Chưa khai báo bệnh nền"
            description="Lịch sử bệnh nền trống. Vui lòng khai báo các bệnh lý hiện tại hoặc bệnh nền của bạn để trợ lý AI kiểm duyệt thuốc an toàn nhất."
            action={
              <Button onClick={handleAdd} className="btn-gradient px-5 py-2 rounded-xl">
                Khai báo bệnh nền đầu tiên
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {records.map((item) => (
              <MedicalRecordCard 
                key={item.id} 
                record={item} 
                onEdit={handleEdit} 
                onDelete={handleDeleteClick} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal thêm/sửa bệnh nền */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Sửa bệnh lý' : 'Thêm bệnh nền mới'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tên bệnh / Tình trạng"
            value={formData.diseaseName}
            onChange={(event) => setFormData({ ...formData, diseaseName: event.target.value })}
            placeholder="Ví dụ: Cao huyết áp, Đái tháo đường tuýp 2, Hen phế quản..."
            required
          />
          
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Trạng thái bệnh lý</label>
            <select
              value={formData.status}
              onChange={(event) => setFormData({ ...formData, status: event.target.value })}
              className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-transparent"
            >
              <option value="active" className="bg-[#111827] text-slate-100">Đang điều trị</option>
              <option value="chronic" className="bg-[#111827] text-slate-100">Mạn tính / Kéo dài</option>
              <option value="remission" className="bg-[#111827] text-slate-100">Đã hồi phục / Thuyên giảm</option>
            </select>
          </div>

          <Input
            label="Năm chẩn đoán"
            type="number"
            value={formData.year}
            onChange={(event) => setFormData({ ...formData, year: event.target.value })}
            placeholder="Ví dụ: 2024"
            min="1900"
            max="2026"
            required
          />

          <Input
            label="Ghi chú thêm"
            value={formData.note}
            onChange={(event) => setFormData({ ...formData, note: event.target.value })}
            placeholder="Ví dụ: Đang sử dụng thuốc điều trị hàng ngày..."
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
        title="Xác nhận xóa bệnh nền"
        message="Hành động này sẽ xóa vĩnh viễn ghi nhận bệnh nền này khỏi tài khoản của bạn. Trợ lý AI sẽ không thể đối chiếu cảnh báo chống chỉ định cho bệnh này nữa."
        confirmText="Xóa ghi nhận"
        cancelText="Hủy bỏ"
        loading={deleting}
      />
    </div>
  );
};

export default MedicalHistory;