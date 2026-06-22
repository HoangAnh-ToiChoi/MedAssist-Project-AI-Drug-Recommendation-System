import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'

import DrugSuggestion from './DrugSuggestion'

const renderPage = () =>
  render(
    <MemoryRouter>
      <DrugSuggestion />
    </MemoryRouter>
  )

test('renders disease-first hierarchy from stored result', async () => {
  localStorage.setItem('drugSuggestions', JSON.stringify({
    topDiseases: [
      {
        id: 'd1',
        code: 'viem_phe_quan_cap',
        displayName: 'Viêm phế quản cấp',
        canonicalName: 'Acute bronchitis',
        score: 0.87,
        icd10Code: 'J20',
        diseaseTypeCode: 'ho_hap',
      },
    ],
    matchedSymptoms: ['Ho', 'Sốt'],
    recommendations: [
      {
        name: 'Salbutamol',
        confidence: 0.81,
        reason: 'Phù hợp disease candidate',
        dosage: 'Theo chỉ định của bác sĩ hoặc hướng dẫn sử dụng.',
      },
    ],
    meta: { specialty: 'ho_hap', symptoms: ['Ho'] },
  }))

  renderPage()

  expect(await screen.findByText(/viêm phế quản cấp/i)).toBeInTheDocument()
  expect(screen.getByText(/hô hấp/i)).toBeInTheDocument()
  expect(screen.getByText(/salbutamol/i)).toBeInTheDocument()
  expect(screen.getByText(/triệu chứng khớp/i)).toBeInTheDocument()
})
