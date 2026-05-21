// Cau hinh Axios va interceptors cho toan bo ung dung MedAssist
import axios from 'axios'

// Base URL lay tu bien moi truong, fallback ve localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

// Tao instance axios voi cau hinh mac dinh
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor REQUEST: tu dong gan Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor RESPONSE: xu ly loi 401 (tam thoi chua refresh token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Xoa token va chuyen ve login khi token het han
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api