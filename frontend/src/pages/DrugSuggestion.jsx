// src/pages/DrugSuggestion.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../components/common/Layout';
import ResultList from '../components/symptoms/ResultList';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';

const DrugSuggestion = () => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const selectedSymptoms = JSON.parse(localStorage.getItem('selectedSymptoms') || '[]');
        if (selectedSymptoms.length === 0) {
          setError('Vui lòng chọn ít nhất một triệu chứng');
          setLoading(false);
          return;
        }
        const response = await api.post('/recommendations', { symptoms: selectedSymptoms });
        setRecommendations(response.data);
      } catch (err) {
        console.error(err);
        setError('Không thể tải gợi ý thuốc. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  if (loading) return <Layout><LoadingSpinner /></Layout>;
  if (error) return <Layout><EmptyState title="Lỗi" description={error} /></Layout>;

  return (
    <Layout>
      <ResultList recommendations={recommendations} />
    </Layout>
  );
};

export default DrugSuggestion;