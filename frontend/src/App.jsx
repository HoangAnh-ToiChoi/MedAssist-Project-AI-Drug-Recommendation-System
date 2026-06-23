import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Pages hiện có
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import OtpVerification from './components/auth/OtpVerification';
import SymptomInput from './pages/SymptomInput';
import Dashboard from './pages/Dashboard';
import DrugSuggestion from './pages/DrugSuggestion';
import MedicalHistory from './pages/MedicalHistory';
import Allergies from './pages/Allergies';
import DemoScenarios from './pages/DemoScenarios';
import AiInsights from './pages/AiInsights';
import ProfilePage from './pages/ProfilePage';

// Admin (CHỈ ADMIN, KHÔNG CÓ PROFILE)
import AdminLayout from './components/Layout/AdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* === PUBLIC ROUTES === */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<OtpVerification />} />

            {/* === PROTECTED ROUTES (Cần đăng nhập) === */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/symptoms" element={
              <ProtectedRoute>
                <SymptomInput />
              </ProtectedRoute>
            } />
            <Route path="/suggestions" element={
              <ProtectedRoute>
                <DrugSuggestion />
              </ProtectedRoute>
            } />
            <Route path="/medical-history" element={
              <ProtectedRoute>
                <MedicalHistory />
              </ProtectedRoute>
            } />
            <Route path="/allergies" element={
              <ProtectedRoute>
                <Allergies />
              </ProtectedRoute>
            } />
            <Route path="/demo-scenarios" element={
              <ProtectedRoute>
                <DemoScenarios />
              </ProtectedRoute>
            } />

            {/* === PROFILE PAGE (Cần đăng nhập) === */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />

            {/* === ADMIN ROUTES (Cần role admin) === */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminDashboard />} />
              <Route path="ai-insights" element={<AiInsights />} />
              <Route path="*" element={
                <div className="text-center py-20 text-slate-500">
                  Trang admin đang phát triển
                </div>
              } />
            </Route>
            <Route path="/ai-insights" element={
              <ProtectedRoute requiredRole="admin">
                <AiInsights />
              </ProtectedRoute>
            } />

            {/* === 404 NOT FOUND === */}
            <Route path="*" element={<div className="text-center py-20 text-slate-500">404 - Trang không tồn tại</div>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
