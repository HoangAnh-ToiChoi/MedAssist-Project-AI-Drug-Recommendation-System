import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const handleCallback = async () => {
      // Check query and hash parameters for returned social tokens
      let hash = window.location.hash;
      if (!hash) {
        const search = window.location.search;
        if (search) {
          hash = search.substring(1);
        }
      } else {
        hash = hash.substring(1);
      }

      if (!hash) return;

      const params = new URLSearchParams(hash);
      const state = params.get('state');
      
      let endpoint = '';
      let payload = null;

      if (state === 'google') {
        const idToken = params.get('id_token');
        if (idToken) {
          endpoint = '/auth/google';
          payload = { idToken };
        }
      } else if (state === 'facebook') {
        const accessToken = params.get('access_token');
        if (accessToken) {
          endpoint = '/auth/facebook';
          payload = { accessToken };
        }
      } else if (state === 'apple') {
        const idToken = params.get('id_token');
        if (idToken) {
          endpoint = '/auth/apple';
          payload = { idToken };
        }
      }

      if (endpoint && payload) {
        setLoading(true);
        setError('');
        try {
          const response = await api.post(endpoint, payload);
          const { accessToken, refreshToken, user } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('user', JSON.stringify(user));
          
          // Clear query/hash params from the address bar
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate('/dashboard');
        } catch (err) {
          setError(err.response?.data?.message || 'Xác thực tài khoản liên kết thất bại.');
        } finally {
          setLoading(false);
        }
      }
    };

    handleCallback();
  }, [navigate]);

  const handleSocialLogin = async (provider) => {
    setError('');
    
    // Redirect to real OAuth providers if Client/App IDs are configured
    if (provider === 'google' && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = window.location.origin + '/login';
      const scope = 'openid email profile';
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=id_token&scope=${encodeURIComponent(scope)}&state=google&nonce=medassist_${Date.now()}`;
      window.location.href = url;
      return;
    }

    if (provider === 'facebook' && import.meta.env.VITE_FACEBOOK_APP_ID) {
      const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
      const redirectUri = window.location.origin + '/login';
      const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=email&state=facebook`;
      window.location.href = url;
      return;
    }

    if (provider === 'apple' && import.meta.env.VITE_APPLE_CLIENT_ID) {
      const clientId = import.meta.env.VITE_APPLE_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_APPLE_REDIRECT_URI || (window.location.origin + '/login');
      const url = `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=id_token&scope=name%20email&response_mode=fragment&state=apple`;
      window.location.href = url;
      return;
    }

    // Otherwise, fall back to mock sandbox token flow
    setLoading(true);
    try {
      let endpoint, payload;
      if (provider === 'google') {
        endpoint = '/auth/google';
        payload = { idToken: 'mock_google_token:demo-social@medassist.com:Demo Social User:mock-google-id-777' };
      } else if (provider === 'facebook') {
        endpoint = '/auth/facebook';
        payload = { accessToken: 'mock_facebook_token:demo-social@medassist.com:Demo Social User:mock-fb-id-777' };
      } else {
        endpoint = '/auth/apple';
        payload = { idToken: 'mock_apple_token:demo-social@medassist.com:Demo Social User:mock-apple-id-777' };
      }

      const response = await api.post(endpoint, payload);
      const { accessToken, refreshToken, user } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || `Đăng nhập bằng ${provider} thất bại. Vui lòng thử lại.`);
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

          {/* Social Logins */}
          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase font-bold tracking-wider">Hoặc tiếp tục với</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button 
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="flex justify-center items-center py-2.5 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
              title="Đăng nhập bằng Google"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
            </button>

            <button 
              type="button"
              onClick={() => handleSocialLogin('facebook')}
              className="flex justify-center items-center py-2.5 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
              title="Đăng nhập bằng Facebook"
            >
              <svg className="w-5 h-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>

            <button 
              type="button"
              onClick={() => handleSocialLogin('apple')}
              className="flex justify-center items-center py-2.5 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
              title="Đăng nhập bằng Apple ID"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.52-.63.73-1.18 1.87-1.03 2.97 1.12.09 2.27-.58 2.98-1.43z"/>
              </svg>
            </button>
          </div>

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
