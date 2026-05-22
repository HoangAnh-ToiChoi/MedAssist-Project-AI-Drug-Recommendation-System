import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/symptoms');
    } catch (err) {
      setError(err.response?.data?.message || 'Sai email hoặc mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-primary text-center mb-2">MedAssist</h1>
        <h2 className="text-2xl font-semibold text-gray-800 text-center mb-8">Đăng nhập</h2>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Mật khẩu" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" variant="primary" size="lg" className="w-full mt-2" loading={loading}>Đăng nhập</Button>
        </form>
        <div className="text-center mt-8">
          <span className="text-gray-500">Chưa có tài khoản? </span>
          <Link to="/register" className="text-primary font-medium hover:underline">Đăng ký</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;