import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { KnowledgeVaultPage } from '../KnowledgeVaultPage'
import { mockApi } from '../../__tests__/setup'
import type { VaultEntry } from '../../../main/contracts'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const mockEntry: VaultEntry = {
  id: 'v1',
  classification: 'confidential',
  sourceType: 'cbo_analysis',
  domainPack: 'cbo-maintenance',
  title: '[CBO] Z_TEST_PROGRAM',
  excerpt: 'EXEC SQL 사용 감지 — Open SQL 전환 권고',
  sourceId: 'f1',
  filePath: '/test/z_test.txt',
  indexedAt: '2026-03-01T00:00:00Z',
}

describe('KnowledgeVaultPage', () => {
  beforeEach(() => {
    mockApi.searchVaultByClassification.mockResolvedValue([])
  })

  it('빈 상태에서 안내 메시지를 표시한다', async () => {
    renderWithProviders(<KnowledgeVaultPage />)

    await waitFor(() => {
      expect(screen.getByText(/기밀 지식이 없어요/)).toBeInTheDocument()
    })
  })

  it('Confidential 탭에서 기밀 항목을 표시한다', async () => {
    mockApi.searchVaultByClassification.mockResolvedValue([mockEntry])
    renderWithProviders(<KnowledgeVaultPage />)

    await waitFor(() => {
      expect(screen.getByText('[CBO] Z_TEST_PROGRAM')).toBeInTheDocument()
    })
    expect(screen.getByText('기밀')).toBeInTheDocument()
  })

  it('Reference 탭으로 전환할 수 있다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<KnowledgeVaultPage />)

    const refTab = screen.getByRole('tab', { name: 'Reference' })
    await user.click(refTab)

    await waitFor(() => {
      expect(screen.getByText(/공개 지식이 없어요/)).toBeInTheDocument()
    })
  })
})
