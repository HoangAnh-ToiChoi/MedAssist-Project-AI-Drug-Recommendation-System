import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import SymptomInput from './pages/SymptomInput';
import DrugSuggestion from './pages/DrugSuggestion';
import MedicalHistory from './pages/MedicalHistory';
import Allergies from './pages/Allergies';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/symptoms" element={<SymptomInput />} />
        <Route path="/suggestions" element={<DrugSuggestion />} />
        <Route path="/medical-history" element={<MedicalHistory />} />
        <Route path="/allergies" element={<Allergies />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;