import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { SettingsPage } from '../SettingsPage'
import { mockApi } from '../../__tests__/setup'
import { useSettingsStore } from '../../stores/settingsStore'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('SettingsPage', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      theme: 'system',
      defaultProvider: 'codex',
      defaultModel: 'gpt-4.1-mini',
    })
    // getAuthStatus는 ProviderAccount가 아닌 AuthStatus 문자열로 반환
    mockApi.getAuthStatus.mockResolvedValue({ status: 'unauthenticated', accountHint: null })
  })

  it('설정 페이지 제목을 렌더링한다', async () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByRole('heading', { name: '설정' })).toBeInTheDocument()
  })

  it('테마 옵션 3개를 표시한다', () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByText('시스템')).toBeInTheDocument()
    expect(screen.getByText('라이트')).toBeInTheDocument()
    expect(screen.getByText('다크')).toBeInTheDocument()
  })

  it('Provider 인증 상태를 확인한다', async () => {
    mockApi.getAuthStatus.mockResolvedValue({ status: 'authenticated', accountHint: 'user@test.com' })
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(mockApi.getAuthStatus).toHaveBeenCalled()
    })
  })

  it('Provider 이름이 표시된다', () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByText('OpenAI (Codex)')).toBeInTheDocument()
    expect(screen.getByText('GitHub Copilot')).toBeInTheDocument()
  })

  it('테마 변경 시 store가 업데이트된다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const darkBtn = screen.getByText('다크')
    await user.click(darkBtn)
    expect(useSettingsStore.getState().theme).toBe('dark')
  })
})
