import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import OtpVerification from './components/auth/OtpVerification'; // Sửa đúng đường dẫn
import SymptomInput from './pages/SymptomInput';
import Dashboard from './pages/Dashboard';
import DrugSuggestion from './pages/DrugSuggestion';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<OtpVerification />} />
        <Route path="/symptoms" element={<SymptomInput />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/suggestions" element={<DrugSuggestion />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;