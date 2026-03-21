import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { SkillsPage } from '../SkillsPage'
import { mockApi } from '../../__tests__/setup'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const compatibleSkill = {
  id: 'cbo-impact-analysis',
  title: 'CBO 변경 영향 분석',
  description: 'CBO 영향 분석',
  supportedDataTypes: ['chat', 'cbo'] as const,
  defaultPromptTemplate: '',
  outputFormat: 'structured-report' as const,
  requiredSources: ['workspace-context', 'vault-confidential'],
  suggestedInputs: ['이 변경이 어떤 객체에 영향을 주는지 정리해줘'],
  domainCodes: ['SE80', 'SE24'],
}

const incompatibleSkill = {
  id: 'btp-architecture',
  title: 'BTP 아키텍처 리뷰',
  description: 'BTP 기반 아키텍처를 리뷰합니다.',
  supportedDataTypes: ['chat'] as const,
  defaultPromptTemplate: '',
  outputFormat: 'checklist' as const,
  requiredSources: ['vault-reference'],
  suggestedInputs: ['RAP 서비스 설계를 리뷰해줘'],
  domainCodes: [],
}

describe('SkillsPage', () => {
  beforeEach(() => {
    mockApi.listSkillPacks.mockResolvedValue([
      {
        id: 'cbo-ops-starter',
        title: 'CBO + Ops Starter Pack',
        description: 'CBO와 운영 중심 skill pack',
        audience: 'mixed',
        skillIds: ['cbo-impact-analysis', 'incident-triage', 'transport-risk-review'],
      },
    ])
    mockApi.listSkills.mockResolvedValue([compatibleSkill, incompatibleSkill])
  })

  it('현재 워크스페이스에 맞는 skill pack과 skill catalog를 표시한다', async () => {
    renderWithProviders(<SkillsPage />)

    expect(screen.getByRole('heading', { name: 'Skills' })).toBeInTheDocument()

    await waitFor(() => {
      expect(mockApi.listSkillPacks).toHaveBeenCalled()
      expect(mockApi.listSkills).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByText('CBO + Ops Starter Pack')).toBeInTheDocument()
      expect(screen.getByText('CBO 변경 영향 분석')).toBeInTheDocument()
    })
  })

  it('모든 skill을 표시한다', async () => {
    renderWithProviders(<SkillsPage />)

    await waitFor(() => {
      expect(screen.getByText('CBO 변경 영향 분석')).toBeInTheDocument()
    })

    expect(screen.getByText('BTP 아키텍처 리뷰')).toBeInTheDocument()
  })

  it('skill 카드 클릭 시 상세 모달을 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SkillsPage />)

    await waitFor(() => {
      expect(screen.getByText('CBO 변경 영향 분석')).toBeInTheDocument()
    })

    await user.click(screen.getByText('CBO 변경 영향 분석'))

    // 모달 내용 검증 — 카드와 모달 양쪽에 같은 텍스트가 있으므로 getAllByText 사용
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(screen.getAllByText('이 변경이 어떤 객체에 영향을 주는지 정리해줘').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('SE80').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('SE24').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('workspace-context')).toBeInTheDocument()
    // structured-report도 카드+모달에 중복 가능
    expect(screen.getAllByText('structured-report').length).toBeGreaterThanOrEqual(1)
  })

  it('모달 닫기 버튼 클릭 시 모달이 사라진다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SkillsPage />)

    await waitFor(() => {
      expect(screen.getByText('CBO 변경 영향 분석')).toBeInTheDocument()
    })

    await user.click(screen.getByText('CBO 변경 영향 분석'))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '닫기' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('skill pack에 포함된 skill 개수를 표시한다', async () => {
    renderWithProviders(<SkillsPage />)

    await waitFor(() => {
      expect(screen.getByText('3 skills')).toBeInTheDocument()
    })
  })

})
