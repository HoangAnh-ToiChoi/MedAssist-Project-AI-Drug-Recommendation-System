import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import api from '../services/api';

const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    if (!fullName.trim()) return 'Họ và tên không được để trống';
    if (!email.trim()) return 'Email không được để trống';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return 'Email không đúng định dạng';
    if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
    if (password !== confirmPassword) return 'Mật khẩu xác nhận không khớp';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errMsg = validate();
    if (errMsg) {
      setError(errMsg);
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', { fullName, email, password });
      // Chuyển sang trang xác thực OTP, truyền email qua state
      navigate('/verify-otp', { state: { email } });
    } catch (err) {
      if (err.response) {
        // Server trả về phản hồi lỗi cụ thể
        setError(err.response.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      } else if (err.request) {
        // Gửi được request nhưng không có phản hồi từ server (ví dụ: rớt mạng)
        setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối.');
      } else {
        // Lỗi cấu hình khác
        setError('Có lỗi xảy ra. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0B0B0C] flex flex-col justify-center items-center px-4 overflow-hidden font-sans">
      {/* Background Glowing Orbs */}
      <div className="bg-glow-orb w-[450px] h-[450px] bg-[#00F0FF] top-[-10%] right-[-10%]"></div>
      <div className="bg-glow-orb w-[450px] h-[450px] bg-[#8A2BE2] bottom-[-10%] left-[-10%]"></div>

      <div className="relative z-10 w-full max-w-md my-8">
        
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-2">
          <Link to="/" className="inline-flex items-center space-x-2">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00F0FF] to-[#8A2BE2] flex items-center justify-center font-bold text-black text-xl shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              M
            </span>
            <span className="text-2xl font-black tracking-tight text-white">
              MedAssist <span className="text-[#00F0FF]">AI</span>
            </span>
          </Link>
          <p className="text-sm text-gray-500">Bảo vệ sức khỏe cho tương lai của bạn</p>
        </div>

        {/* Register Box - Glassmorphism style */}
        <div className="glass-card p-8 rounded-2xl border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Tạo tài khoản mới</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl mb-6 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Họ và tên</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Nguyễn Văn A"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@medassist.com"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mật khẩu (tối thiểu 8 ký tự)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Xác nhận mật khẩu</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="btn-gradient w-full py-3.5 mt-4 rounded-xl text-sm font-semibold tracking-wide"
              loading={loading}
            >
              Đăng ký tài khoản
            </Button>
          </form>

          <div className="text-center mt-6 pt-6 border-t border-white/5">
            <span className="text-xs text-gray-400">Đã có tài khoản? </span>
            <Link to="/login" className="text-xs text-[#00F0FF] font-semibold hover:underline">
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
