import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Navbar from '../components/common/Navbar';
import SymptomSelector from '../components/symptoms/SymptomSelector'; // ← THÊM DÒNG NÀY

const SymptomInput = () => {
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const navigate = useNavigate();

  const handleAdd = (symptom) => {
    setSelectedSymptoms([...selectedSymptoms, symptom]);
  };

  const handleRemove = (symptom) => {
    setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
  };

  const handleSubmit = () => {
    localStorage.setItem('selectedSymptoms', JSON.stringify(selectedSymptoms));
    navigate('/suggestions');
  };

  return (
    <div>
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-primary mb-6">Kiểm tra triệu chứng</h1>
        <SymptomSelector
          selected={selectedSymptoms}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
        <div className="mt-8">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={selectedSymptoms.length === 0}
            className="w-full md:w-auto"
          >
            Gợi ý thuốc
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SymptomInput;