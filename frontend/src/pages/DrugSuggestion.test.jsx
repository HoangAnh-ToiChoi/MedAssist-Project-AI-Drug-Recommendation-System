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
    llmExplanation: {
      enabled: true,
      status: 'success',
      provider: 'gemini',
      summary: 'Bạn đang được đánh giá trong chuyên khoa Hô hấp.',
      explanation: 'Hệ thống ưu tiên bệnh hô hấp phù hợp với triệu chứng đã chọn.',
      safetyNote: 'Thông tin chỉ mang tính tham khảo và không thay thế bác sĩ.',
    },
    meta: { specialty: 'ho_hap', symptoms: ['Ho'] },
  }))

  renderPage()

  expect(await screen.findByText(/viêm phế quản cấp/i)).toBeInTheDocument()
  expect(screen.getByText('Chuyên khoa:')).toBeInTheDocument()
  expect(screen.getByText(/^Hô hấp$/i)).toBeInTheDocument()
  expect(screen.getByText(/salbutamol/i)).toBeInTheDocument()
  expect(screen.getByText(/triệu chứng khớp/i)).toBeInTheDocument()
  expect(screen.getByText(/giải thích gợi ý/i)).toBeInTheDocument()
  expect(screen.getByText(/provider: gemini/i)).toBeInTheDocument()
})

test('renders explanation even when no safe recommendations remain', async () => {
  localStorage.setItem('drugSuggestions', JSON.stringify({
    topDiseases: [
      {
        id: 'd2',
        code: 'migraine',
        displayName: 'Migraine',
        score: 0.82,
      },
    ],
    matchedSymptoms: ['Đau đầu'],
    recommendations: [],
    llmExplanation: {
      enabled: false,
      status: 'fallback',
      provider: 'none',
      summary: 'Không còn thuốc an toàn sau bước lọc.',
      explanation: 'Backend đã loại các thuốc xung đột với dị ứng hoặc chống chỉ định.',
      safetyNote: 'Cần tham khảo bác sĩ để được đánh giá thêm.',
    },
    meta: { specialty: 'than_kinh', symptoms: ['Đau đầu'] },
  }))

  renderPage()

  expect(await screen.findByText(/không tìm thấy gợi ý phù hợp/i)).toBeInTheDocument()
  expect(screen.getByText(/giải thích gợi ý/i)).toBeInTheDocument()
  expect(screen.getByText(/provider: deterministic fallback/i)).toBeInTheDocument()
  expect(screen.getByText(/không còn thuốc an toàn sau bước lọc/i)).toBeInTheDocument()
})
