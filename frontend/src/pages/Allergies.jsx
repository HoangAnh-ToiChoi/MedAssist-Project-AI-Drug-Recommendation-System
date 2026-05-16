import React, { useState, useEffect } from 'react';
import Layout from '../components/common/Layout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';

const Allergies = () => {
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    drugName: '',
    severity: 'medium',
    reaction: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAllergies = async () => {
    try {
      const res = await api.get('/allergies');
      setAllergies(res.data.data || res.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách dị ứng:', err);
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
    setFormData({
      drugName: item.drugName,
      severity: item.severity,
      reaction: item.reaction || '',
    });
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

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'severe':
        return <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Nặng</span>;
      case 'medium':
        return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Trung bình</span>;
      default:
        return <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Nhẹ</span>;
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý dị ứng thuốc</h1>
        <Button onClick={handleAdd}>+ Thêm dị ứng</Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : allergies.length === 0 ? (
        <EmptyState
          title="Chưa có dữ liệu dị ứng"
          description="Thêm các loại thuốc bạn bị dị ứng để được gợi ý chính xác hơn."
          action={<Button onClick={handleAdd}>Thêm ngay</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allergies.map((item) => (
            <Card key={item.id}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{item.drugName}</h3>
                  <div className="mt-1">{getSeverityBadge(item.severity)}</div>
                  {item.reaction && (
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">Phản ứng:</span> {item.reaction}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(item)} className="text-blue-600">✏️</button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-600">🗑️</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Sửa dị ứng' : 'Thêm dị ứng thuốc'}
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Tên thuốc"
            value={formData.drugName}
            onChange={(e) => setFormData({ ...formData, drugName: e.target.value })}
            required
            placeholder="Ví dụ: Penicillin"
          />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ</label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="submit" loading={submitting}>Lưu</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default Allergies;