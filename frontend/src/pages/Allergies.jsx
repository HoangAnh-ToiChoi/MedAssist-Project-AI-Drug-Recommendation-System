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
  const [formData, setFormData] = useState({ drugName: '', severity: 'medium', reaction: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ drugName: '', severity: 'medium', reaction: '' });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ drugName: item.drugName, severity: item.severity, reaction: item.reaction || '' });
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
    try {
      if (editingId) {
        await api.put(`/allergies/${editingId}`, formData);
      } else {
        await api.post('/allergies', formData);
      }
      setModalOpen(false);
      fetchAllergies();
    } catch (err) {
      alert('Lưu thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const severityBadge = (severity) => {
    switch (severity) {
      case 'severe': return <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full text-xs">Nặng</span>;
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
                    <h3 className="font-bold text-lg text-white">💊 {item.drugName}</h3>
                    <div className="mt-1">{severityBadge(item.severity)}</div>
                    {item.reaction && <p className="text-xs text-gray-400 mt-2">📝 {item.reaction}</p>}
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

      {/* Modal thêm/sửa - đã sửa giao diện input */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Sửa dị ứng' : 'Thêm dị ứng thuốc'}>
        <form onSubmit={handleSubmit}>
          <Input
            label="Tên thuốc"
            value={formData.drugName}
            onChange={(e) => setFormData({ ...formData, drugName: e.target.value })}
            required
            className="bg-white text-black placeholder-gray-400"
          />
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-400 mb-1">Mức độ</label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full bg-white text-black border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="mild">Nhẹ</option>
              <option value="medium">Trung bình</option>
              <option value="severe">Nặng</option>
            </select>
          </div>
          <Input
            label="Phản ứng (triệu chứng)"
            value={formData.reaction}
            onChange={(e) => setFormData({ ...formData, reaction: e.target.value })}
            placeholder="Ví dụ: nổi mề đay, khó thở..."
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

export default Allergies;