import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Button from '../components/common/Button';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/common/Input';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const ProfilePage = () => {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: '',
    phoneNumber: ''
  });

  // Fetch profile data from API
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/profile');
      const data = res.data?.data || res.data;
      if (data) {
        setProfile(data);
        setFormData({
          fullName: data.fullName || '',
          dateOfBirth: formatToInputDate(data.dateOfBirth),
          gender: data.gender ? data.gender.toLowerCase() : '',
          phoneNumber: data.phoneNumber || ''
        });
        
        // Sync back to local storage user object if mismatch found
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userObj = JSON.parse(storedUser);
            if (userObj.fullName !== data.fullName || userObj.email !== data.email) {
              const updatedUser = { ...userObj, ...data };
              localStorage.setItem('user', JSON.stringify(updatedUser));
            }
          } catch (e) {
            console.error('Failed to sync localStorage user object', e);
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải dữ liệu thông tin cá nhân. Vui lòng tải lại trang.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Format YYYY-MM-DD for date input
  const formatToInputDate = (dateString) => {
    if (!dateString) return '';
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    return dateString;
  };

  // Format date to display DD/MM/YYYY
  const formatToDisplayDate = (dateString) => {
    if (!dateString) return 'Chưa cập nhật';
    const datePart = dateString.includes('T') ? dateString.split('T')[0] : dateString;
    const parts = datePart.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  // Map gender identifier to Vietnamese labels
  const getGenderLabel = (gender) => {
    if (!gender) return 'Chưa cập nhật';
    const g = gender.toLowerCase();
    if (g === 'male') return 'Nam';
    if (g === 'female') return 'Nữ';
    if (g === 'other') return 'Khác';
    return gender;
  };

  // Local form validation
  const validateForm = () => {
    if (!formData.fullName.trim()) {
      toast.warning('Họ và tên không được để trống.');
      return false;
    }
    
    if (formData.phoneNumber) {
      const phoneRegex = /^(0|\+84)[35789]\d{8}$/;
      if (!phoneRegex.test(formData.phoneNumber.trim())) {
        toast.warning('Số điện thoại không đúng định dạng Việt Nam (ví dụ: 0987654321 hoặc +84987654321).');
        return false;
      }
    }

    return true;
  };

  // Handle form submissions
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const payload = {
      fullName: formData.fullName.trim(),
      dateOfBirth: formData.dateOfBirth || null,
      gender: formData.gender || null,
      phoneNumber: formData.phoneNumber.trim() || null
    };

    try {
      const res = await api.put('/profile', payload);
      const updatedProfile = res.data?.data || res.data;
      
      if (updatedProfile) {
        setProfile(updatedProfile);
        
        // Sync local storage user details for navbar and dashboard consistency
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userObj = JSON.parse(storedUser);
            const mergedUser = { ...userObj, ...updatedProfile };
            localStorage.setItem('user', JSON.stringify(mergedUser));
          } catch (e) {
            console.error('Error updating localStorage', e);
          }
        }
        
        toast.success('Cập nhật thông tin cá nhân thành công.');
        setIsEditing(false);
        
        // Dispatch custom storage/state event to notify header navbar
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Không thể lưu thông tin cá nhân. Vui lòng thử lại.';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Revert form data on cancellation
  const handleCancel = () => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        dateOfBirth: formatToInputDate(profile.dateOfBirth),
        gender: profile.gender ? profile.gender.toLowerCase() : '',
        phoneNumber: profile.phoneNumber || ''
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="relative min-h-screen bg-[#0B0F19] text-slate-100 font-sans overflow-hidden">
      {/* Background Glowing Orbs */}
      <div className="bg-glow-orb w-[400px] h-[400px] bg-teal-500/5 top-[10%] left-[-10%]"></div>
      <div className="bg-glow-orb w-[500px] h-[500px] bg-sky-500/5 bottom-[-10%] right-[-10%]"></div>

      <Navbar />

      <div className="relative z-10 container mx-auto px-6 py-8 max-w-4xl space-y-6">
        {/* Page Header */}
        <PageHeader 
          title="👤 Thông Tin Cá Nhân" 
          description="Quản lý và cập nhật thông tin cá nhân của bạn để hỗ trợ trợ lý AI rà soát chống chỉ định hoặc gợi ý thuốc tham khảo chính xác nhất."
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
            <p className="text-slate-400 text-sm">Đang tải thông tin cá nhân...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3 items-start">
            
            {/* Left Card: Summary Profile */}
            <div className="glass-card p-6 rounded-2xl border-white/5 flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-600 flex items-center justify-center font-black text-white text-3xl shadow-[0_0_25px_rgba(20,184,166,0.25)] border border-teal-400/20">
                  {(profile?.fullName || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#0B0F19] flex items-center justify-center shadow-lg" title="Tài khoản hoạt động">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">{profile?.fullName || 'Thành viên'}</h2>
                <p className="text-xs text-slate-400 mt-1">{profile?.email}</p>
              </div>

              <div className="w-full pt-4 border-t border-slate-800 space-y-2 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold uppercase tracking-wider">Vai trò</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/15 font-bold uppercase text-[9px] tracking-wider">
                    {profile?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold uppercase tracking-wider">Ngày tham gia</span>
                  <span className="text-slate-300 font-medium">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : 'Chưa xác định'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Card: Detailed Profile Form */}
            <div className="md:col-span-2 glass-card p-6 md:p-8 rounded-2xl border-white/5 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <h3 className="text-base font-bold text-slate-200 tracking-wide uppercase">Chi tiết tài khoản</h3>
                {!isEditing && (
                  <Button 
                    onClick={() => setIsEditing(true)} 
                    className="btn-gradient px-4 py-2 rounded-xl text-xs font-semibold"
                  >
                    ✏️ Cập nhật thông tin
                  </Button>
                )}
              </div>

              {!isEditing ? (
                /* Read-only View Mode */
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Họ và tên</span>
                    <p className="text-sm font-bold text-slate-200">{profile?.fullName || 'Chưa cập nhật'}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Địa chỉ Email</span>
                    <p className="text-sm font-bold text-slate-400 flex items-center gap-1.5">
                      {profile?.email}
                      <span className="text-[10px] text-slate-500 border border-slate-800 px-1.5 py-0.5 rounded-md font-normal select-none">
                        Khóa
                      </span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày sinh</span>
                    <p className="text-sm font-bold text-slate-200">{formatToDisplayDate(profile?.dateOfBirth)}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Giới tính</span>
                    <p className="text-sm font-bold text-slate-200">{getGenderLabel(profile?.gender)}</p>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Số điện thoại</span>
                    <p className="text-sm font-bold text-slate-200">{profile?.phoneNumber || 'Chưa cập nhật'}</p>
                  </div>
                </div>
              ) : (
                /* Interactive Edit Mode */
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    
                    <div className="sm:col-span-2">
                      <Input
                        label="Họ và tên"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Nhập đầy đủ họ tên của bạn"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ngày sinh</label>
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-transparent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Giới tính</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-transparent"
                      >
                        <option value="" className="bg-[#111827] text-slate-400">Chưa xác định</option>
                        <option value="male" className="bg-[#111827] text-slate-100">Nam</option>
                        <option value="female" className="bg-[#111827] text-slate-100">Nữ</option>
                        <option value="other" className="bg-[#111827] text-slate-100">Khác</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <Input
                        label="Số điện thoại"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        placeholder="Ví dụ: 0987654321"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
                    <Button 
                      onClick={handleCancel} 
                      className="btn-neon-outline px-5 py-2 rounded-xl text-sm font-semibold"
                      disabled={submitting}
                    >
                      Hủy bỏ
                    </Button>
                    <Button 
                      type="submit" 
                      className="btn-gradient px-5 py-2 rounded-xl text-sm font-semibold"
                      loading={submitting}
                    >
                      Lưu thay đổi
                    </Button>
                  </div>
                </form>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
