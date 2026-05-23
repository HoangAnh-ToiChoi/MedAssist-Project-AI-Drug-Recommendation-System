import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../common/Button';
import api from '../../services/api';

const OtpVerification = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Mã OTP gồm 6 chữ số');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, otp });
      // Xác thực xong thì chuyển về trang login
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await api.post('/auth/resend-otp', { email });
      alert('Đã gửi lại mã OTP thành công!');
    } catch (err) {
      setError('Không thể gửi lại mã');
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0B0B0C] flex flex-col justify-center items-center px-4 overflow-hidden font-sans">
      {/* Background Glowing Orbs */}
      <div className="bg-glow-orb w-[400px] h-[400px] bg-[#00F0FF] top-[-10%] left-[-10%]"></div>
      <div className="bg-glow-orb w-[400px] h-[400px] bg-[#8A2BE2] bottom-[-10%] right-[-10%]"></div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-2">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00F0FF] to-[#8A2BE2] flex items-center justify-center font-bold text-black text-xl shadow-[0_0_20px_rgba(0,240,255,0.4)] mx-auto">
            M
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white mt-4">MedAssist AI</h1>
          <p className="text-sm text-gray-500">Bảo mật tài khoản của bạn</p>
        </div>

        {/* Verification Card - Glassmorphism style */}
        <div className="glass-card p-8 rounded-2xl border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <h2 className="text-xl font-bold text-white text-center mb-2">Xác thực tài khoản</h2>
          <p className="text-xs text-gray-400 text-center mb-6 leading-relaxed">
            Mã xác thực đã được gửi đến email:<br />
            <strong className="text-[#00F0FF] text-sm">{email || 'email của bạn'}</strong>
          </p>

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mã OTP (6 chữ số)</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength="6"
                required
                className="input-field text-center text-lg font-bold tracking-[0.5em]"
              />
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded-xl mt-3 text-xs text-center font-medium">
                  {error}
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="btn-gradient w-full py-3.5 mt-4 rounded-xl text-sm font-semibold tracking-wide"
              loading={loading}
            >
              Xác thực tài khoản
            </Button>
          </form>

          <div className="text-center mt-6 pt-6 border-t border-white/5 flex flex-col items-center gap-2">
            <span className="text-xs text-gray-500">Không nhận được mã?</span>
            <button onClick={handleResend} className="text-xs text-[#00F0FF] font-semibold hover:underline">
              Gửi lại mã OTP mới
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;