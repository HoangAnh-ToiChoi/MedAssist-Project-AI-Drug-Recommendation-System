import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../common/Button';
import Input from '../common/Input';
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
      navigate('/');
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
      alert('Đã gửi lại mã OTP');
    } catch (err) {
      setError('Không thể gửi lại mã');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-primary text-center mb-2">MedAssist</h1>
        <h2 className="text-xl font-semibold text-center mb-6">Xác thực tài khoản</h2>
        <p className="text-gray-600 text-center mb-4">
          Mã xác thực đã được gửi đến email <strong>{email}</strong>
        </p>
        <form onSubmit={handleVerify}>
          <Input label="Mã OTP" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" maxLength="6" required />
          {error && <div className="text-red-600 text-sm mt-1 mb-2">{error}</div>}
          <Button type="submit" variant="primary" size="lg" className="w-full mt-4" loading={loading}>
            Xác thực
          </Button>
        </form>
        <div className="text-center mt-6">
          <button onClick={handleResend} className="text-primary text-sm hover:underline">
            Gửi lại mã
          </button>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;