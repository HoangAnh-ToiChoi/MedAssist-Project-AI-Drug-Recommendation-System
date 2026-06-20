import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import OtpVerification from './components/auth/OtpVerification';
import SymptomInput from './pages/SymptomInput';
import Dashboard from './pages/Dashboard';
import DrugSuggestion from './pages/DrugSuggestion';
import MedicalHistory from './pages/MedicalHistory';
import Allergies from './pages/Allergies';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<OtpVerification />} />
          <Route path="/symptoms" element={<SymptomInput />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/suggestions" element={<DrugSuggestion />} />
          <Route path="/medical-history" element={<MedicalHistory />} />
          <Route path="/allergies" element={<Allergies />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}


export default App;
