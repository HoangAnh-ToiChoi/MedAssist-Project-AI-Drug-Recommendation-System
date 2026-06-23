/**
 * ============================================================
 * CHCKNSPC-99: UI Profile Page
 * ============================================================
 * Trang hồ sơ cá nhân cho phép người dùng xem và cập nhật
 * thông tin cá nhân (Họ tên, Ngày sinh, Giới tính, SĐT)
 * 
 * Chỉ người dùng đã đăng nhập mới truy cập được.
 * ============================================================
 */

import { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Button from '../components/common/Button';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/common/Input';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: '',
    phoneNumber: '',
  });

  // Lấy thông tin profile từ API
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/profile');
      const data = res.data?.data || res.data;
      
      if (data) {
        setProfile(data);
        setFormData({
          fullName: data.fullName || '',
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
          gender: data.gender || '',
          phoneNumber: data.phoneNumber || '',
        });
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
      toast.error('Không thể tải thông tin cá nhân');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Format hiển thị ngày sinh (DD/MM/YYYY)
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'Chưa cập nhật';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  // Lấy nhãn giới tính
  const getGenderLabel = (gender) => {
    const map = { male: 'Nam', female: 'Nữ', other: 'Khác' };
    return map[gender] || 'Chưa cập nhật';
  };

  // Xác thực form
  const validateForm = () => {
    if (!formData.fullName.trim()) {
      toast.warning('Họ và tên không được để trống');
      return false;
    }
    if (formData.phoneNumber) {
      const phoneRegex = /^(0|\+84)[35789]\d{8}$/;
      if (!phoneRegex.test(formData.phoneNumber.trim())) {
        toast.warning('Số điện thoại không đúng định dạng');
        return false;
      }
    }
    return true;
  };

  // Lưu thông tin
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender || null,
        phoneNumber: formData.phoneNumber.trim() || null,
      };

      const res = await api.put('/profile', payload);
      const updated = res.data?.data || res.data;

      if (updated) {
        setProfile(updated);
        // Cập nhật lại AuthContext
        if (setUser) {
          setUser((prev) => ({ ...prev, ...updated }));
        }
        // Cập nhật localStorage
        const stored = localStorage.getItem('user');
        if (stored) {
          const userObj = JSON.parse(stored);
          localStorage.setItem('user', JSON.stringify({ ...userObj, ...updated }));
        }
        toast.success('Cập nhật thông tin thành công');
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Update profile error:', err);
      toast.error(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Hủy chỉnh sửa
  const handleCancel = () => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
        gender: profile.gender || '',
        phoneNumber: profile.phoneNumber || '',
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-slate-400">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0B0F19] text-slate-100">
      <Navbar />
      
      <div className="relative z-10 container mx-auto px-6 py-8 max-w-4xl">
        <PageHeader 
          title="👤 Thông tin cá nhân"
          description="Quản lý và cập nhật thông tin cá nhân của bạn"
        />

        <div className="grid gap-6 md:grid-cols-3 mt-6">
          {/* Card trái: Avatar và thông tin tóm tắt */}
          <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-teal-500 to-sky-600 flex items-center justify-center text-3xl text-white font-bold">
              {(profile?.fullName || 'U').charAt(0).toUpperCase()}
            </div>
            <h2 className="text-lg font-bold text-white mt-4">{profile?.fullName || 'Thành viên'}</h2>
            <p className="text-sm text-slate-400">{profile?.email}</p>
            <div className="w-full mt-4 pt-4 border-t border-slate-800 text-left text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Vai trò</span>
                <span className="text-teal-400 font-medium">
                  {profile?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Tham gia</span>
                <span className="text-slate-300">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : '...'}
                </span>
              </div>
            </div>
          </div>

          {/* Card phải: Thông tin chi tiết */}
          <div className="md:col-span-2 glass-card p-6 rounded-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="font-bold text-white">Chi tiết tài khoản</h3>
              {!isEditing && (
                <Button 
                  onClick={() => setIsEditing(true)} 
                  className="btn-gradient px-4 py-2 rounded-xl text-sm"
                >
                  ✏️ Cập nhật
                </Button>
              )}
            </div>

            {!isEditing ? (
              // Chế độ xem
              <div className="grid gap-4 sm:grid-cols-2 mt-4">
                <div><span className="text-slate-500 text-sm">Họ và tên</span><p className="font-medium">{profile?.fullName || '—'}</p></div>
                <div><span className="text-slate-500 text-sm">Email</span><p className="font-medium text-slate-400">{profile?.email}</p></div>
                <div><span className="text-slate-500 text-sm">Ngày sinh</span><p className="font-medium">{formatDateDisplay(formData.dateOfBirth)}</p></div>
                <div><span className="text-slate-500 text-sm">Giới tính</span><p className="font-medium">{getGenderLabel(profile?.gender)}</p></div>
                <div className="sm:col-span-2"><span className="text-slate-500 text-sm">Số điện thoại</span><p className="font-medium">{profile?.phoneNumber || 'Chưa cập nhật'}</p></div>
              </div>
            ) : (
              // Chế độ chỉnh sửa
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <Input
                  label="Họ và tên"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
                <Input label="Email" value={profile?.email} disabled className="opacity-60" />
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Ngày sinh</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Giới tính</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white"
                    >
                      <option value="">Chưa xác định</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                </div>

                <Input
                  label="Số điện thoại"
                  placeholder="0987654321"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <Button type="button" onClick={handleCancel} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700">Hủy</Button>
                  <Button type="submit" className="btn-gradient px-4 py-2 rounded-lg" loading={submitting}>Lưu</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}