import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    if (!email.trim() && !password.trim()) {
      return 'Vui lòng nhập email';
    }
    if (!email.trim()) {
      return 'Vui lòng nhập email';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Email không đúng định dạng';
    }
    if (!password.trim()) {
      return 'Vui lòng nhập mật khẩu';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/dashboard');
    } catch (err) {
      if (err.response) {
        // Server trả về phản hồi lỗi cụ thể
        setError(err.response.data?.message || 'Sai email hoặc mật khẩu');
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
      <div className="bg-glow-orb w-[400px] h-[400px] bg-[#00F0FF] top-[-10%] left-[-10%]"></div>
      <div className="bg-glow-orb w-[400px] h-[400px] bg-[#FF007F] bottom-[-10%] right-[-10%]"></div>

      <div className="relative z-10 w-full max-w-md">
        
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
          <p className="text-sm text-gray-500">Trợ lý sức khỏe ảo của bạn</p>
        </div>

        {/* Login Box - Glassmorphism style */}
        <div className="glass-card p-8 rounded-2xl border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Đăng nhập</h2>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl mb-6 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mật khẩu</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
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
              Đăng nhập tài khoản
            </Button>
          </form>

          <div className="text-center mt-6 pt-6 border-t border-white/5">
            <span className="text-xs text-gray-400">Chưa có tài khoản? </span>
            <Link to="/register" className="text-xs text-[#00F0FF] font-semibold hover:underline">
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
