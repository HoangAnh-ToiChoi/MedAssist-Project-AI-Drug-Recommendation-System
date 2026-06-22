import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

const mockNavigate = vi.fn()

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn((url) => {
      if (url === '/specialties') {
        return Promise.resolve({
          data: {
            data: [
              { id: '1', code: 'ho_hap', name: 'Hô hấp', displayOrder: 1 },
            ],
          },
        })
      }

      if (url === '/specialties/ho_hap/symptoms') {
        return Promise.resolve({
          data: {
            data: [
              { id: 's1', code: 'ho', name: 'Ho' },
            ],
          },
        })
      }

      if (url === '/allergies' || url === '/history') {
        return Promise.resolve({ data: { data: [] } })
      }

      return Promise.resolve({ data: { data: [] } })
    }),
    post: vi.fn(() => Promise.resolve({ data: { data: { recommendations: [] } } })),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import SymptomInput from './SymptomInput'

const renderPage = () =>
  render(
    <MemoryRouter>
      <SymptomInput />
    </MemoryRouter>
  )

test('blocks submit before specialty selection', async () => {
  renderPage()

  const submitButton = await screen.findByRole('button', { name: /xem gợi ý thuốc tham khảo/i })
  expect(submitButton).toBeDisabled()
  expect(screen.getAllByText(/chọn chuyên khoa trước/i).length).toBeGreaterThan(0)
})

test('submits specialty-scoped symptom selection and navigates to suggestions', async () => {
  const { default: api } = await import('../services/api')
  const user = userEvent.setup()
  renderPage()

  const specialtySelect = await screen.findByRole('combobox')
  await user.selectOptions(specialtySelect, 'ho_hap')

  await waitFor(() => {
    expect(screen.getByText('Ho')).toBeInTheDocument()
  })

  await user.click(screen.getByRole('button', { name: /ho/i }))
  await user.click(screen.getByRole('button', { name: /xem gợi ý thuốc tham khảo/i }))

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/symptoms/check', expect.objectContaining({
      specialty: 'ho_hap',
      symptoms: ['Ho'],
    }))
    expect(mockNavigate).toHaveBeenCalledWith('/suggestions')
  })
})
