// src/pages/MedicalHistory.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../components/common/Layout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';

const MedicalHistory = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ diseaseName: '', year: '', note: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/history');
      setRecords(res.data.data || res.data || []);
    } catch (err) {
      console.error(err);
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
    setFormData({ diseaseName: item.diseaseName, year: item.year, note: item.note || '' });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa?')) return;
    try {
      await api.delete(`/history/${id}`);
      fetchHistory();
    } catch (err) {
      alert('Xóa thất bại');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/history/${editingId}`, formData);
      } else {
        await api.post('/history', formData);
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
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tiền sử bệnh</h1>
        <Button onClick={handleAdd}>+ Thêm bệnh</Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : records.length === 0 ? (
        <EmptyState title="Chưa có dữ liệu" description="Thêm bệnh nền để được gợi ý chính xác hơn." action={<Button onClick={handleAdd}>Thêm ngay</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {records.map((item) => (
            <Card key={item.id}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{item.diseaseName}</h3>
                  <p className="text-sm text-gray-600">Năm: {item.year}</p>
                  {item.note && <p className="text-sm text-gray-500 mt-1">{item.note}</p>}
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Sửa bệnh' : 'Thêm bệnh'}>
        <form onSubmit={handleSubmit}>
          <Input label="Tên bệnh" value={formData.diseaseName} onChange={(e) => setFormData({ ...formData, diseaseName: e.target.value })} required />
          <Input label="Năm chẩn đoán" type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} required />
          <Input label="Ghi chú" value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} placeholder="Thuốc đang dùng, mức độ..." />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="submit" loading={submitting}>Lưu</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default MedicalHistory;