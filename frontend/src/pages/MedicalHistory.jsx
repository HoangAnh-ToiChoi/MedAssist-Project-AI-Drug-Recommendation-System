import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import api from '../services/api';

const MedicalHistory = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ diseaseName: '', year: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const toFormData = (item) => ({
    diseaseName: item.condition || '',
    year: item.diagnosedAt ? new Date(item.diagnosedAt).getFullYear().toString() : '',
    note: item.notes || '',
  });

  const toApiPayload = () => ({
    condition: formData.diseaseName.trim(),
    status: 'chronic',
    diagnosedAt: formData.year ? `${formData.year}-01-01` : null,
    notes: formData.note?.trim() || null,
  });

  const fetchHistory = async () => {
    try {
      const res = await api.get('/history');
      setRecords(res.data.data || res.data || []);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ diseaseName: '', year: '', note: '' });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData(toFormData(item));
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa bệnh nền này?')) return;
    try {
      await api.delete(`/history/${id}`);
      fetchHistory();
    } catch (err) {
      alert('Xóa thất bại');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.diseaseName.trim()) {
      alert('Vui lòng nhập tên bệnh');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/history/${editingId}`, toApiPayload());
      } else {
        await api.post('/history', toApiPayload());
      }
      setModalOpen(false);
      fetchHistory();
    } catch (err) {
      alert('Lưu thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0B0B0C] text-gray-100 font-sans overflow-hidden">
      <div className="bg-glow-orb w-[400px] h-[400px] bg-[#00F0FF]/10 top-[20%] left-[-10%]"></div>
      <div className="bg-glow-orb w-[500px] h-[500px] bg-[#8A2BE2]/10 bottom-[-10%] right-[-10%]"></div>

      <Navbar />

      <div className="relative z-10 container mx-auto px-6 py-10 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold">📋 Tiền Sử Bệnh</h1>
          <Button onClick={handleAdd} className="btn-gradient px-5 py-2 rounded-xl">+ Thêm bệnh</Button>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4">{error}</div>}

        {loading ? (
          <div className="text-center py-10">Đang tải...</div>
        ) : records.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center">
            <p className="text-gray-400">Chưa có bệnh nền nào. Hãy thêm bệnh nền để được gợi ý thuốc chính xác hơn.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {records.map((item) => (
              <div key={item.id} className="glass-card p-5 rounded-2xl border-white/5 hover:border-[#00F0FF]/30 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-white">{item.condition}</h3>
                    <p className="text-sm text-gray-400 mt-1">📅 Năm: {item.diagnosedAt ? new Date(item.diagnosedAt).getFullYear() : 'N/A'}</p>
                    {item.notes && <p className="text-xs text-gray-500 mt-2">{item.notes}</p>}
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Sửa bệnh' : 'Thêm bệnh nền'}>
        <form onSubmit={handleSubmit}>
          <Input
            label="Tên bệnh"
            value={formData.diseaseName}
            onChange={(event) => setFormData({ ...formData, diseaseName: event.target.value })}
            required
            className="bg-white text-black placeholder-gray-400"
          />
          <Input
            label="Năm chẩn đoán"
            type="number"
            value={formData.year}
            onChange={(event) => setFormData({ ...formData, year: event.target.value })}
            required
            className="bg-white text-black placeholder-gray-400"
          />
          <Input
            label="Ghi chú (thuốc đang dùng...)"
            value={formData.note}
            onChange={(event) => setFormData({ ...formData, note: event.target.value })}
            className="bg-white text-black placeholder-gray-400"
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="submit" loading={submitting}>Lưu</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MedicalHistory;