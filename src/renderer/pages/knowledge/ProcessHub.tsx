import { useState } from 'react'
import { Bot, FolderOpen, Plus } from 'lucide-react'
import type { RoutineKnowledgeLink } from '../../../main/contracts.js'
import { DOMAIN_PACK_DETAILS, useWorkspaceStore } from '../../stores/workspaceStore.js'
import { useAppShellStore } from '../../stores/appShellStore.js'
import { Button } from '../../components/ui/Button.js'
import { useProcessHub } from './process/useProcessHub.js'
import { ProcessEditorModal } from './process/ProcessEditorModal.js'
import { ProcessListSection } from './process/ProcessListSection.js'
import { ProcessDetailSection } from './process/ProcessDetailSection.js'
import { RelatedKnowledgePanel } from './process/RelatedKnowledgePanel.js'
import './ProcessHub.css'

type ProcessFrequencyFilter = 'all' | 'active' | string

interface ProcessStepDraft {
  title: string
  description: string
  module: string
}

interface ProcessDraft {
  name: string
  frequency: string
  description: string
  triggerDay: string
  triggerMonth: string
  steps: ProcessStepDraft[]
}

function createEmptyDraft(): ProcessDraft {
  return {
    name: '',
    frequency: 'monthly',
    description: '',
    triggerDay: '',
    triggerMonth: '',
    steps: [{ title: '', description: '', module: 'FI' }],
  }
}

export function ProcessHub() {
  const domainPack = useWorkspaceStore((state) => state.domainPack)
  const packDetail = DOMAIN_PACK_DETAILS[domainPack]
  const navigateToKnowledge = useAppShellStore((state) => state.setSection)

  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [frequencyFilter, setFrequencyFilter] = useState<ProcessFrequencyFilter>('all')
  const [showCreator, setShowCreator] = useState(false)
  const [draft, setDraft] = useState<ProcessDraft>(createEmptyDraft)
  const [formError, setFormError] = useState<string | null>(null)

  const hubData = useProcessHub(
    selectedProcessId,
    setSelectedProcessId,
    searchQuery,
    setSearchQuery,
    frequencyFilter,
    setFrequencyFilter
  )

  function updateDraft<K extends keyof ProcessDraft>(key: K, value: ProcessDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateStep(index: number, key: keyof ProcessStepDraft, value: string) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => (
        stepIndex === index ? { ...step, [key]: value } : step
      )),
    }))
  }

  function addStep() {
    setDraft((current) => ({
      ...current,
      steps: [...current.steps, { title: '', description: '', module: 'FI' }],
    }))
  }

  function removeStep(index: number) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.filter((_, stepIndex) => stepIndex !== index),
    }))
  }

  async function handleCreateProcess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const steps = draft.steps
      .map((step, index) => ({
        title: step.title.trim(),
        description: step.description.trim() || undefined,
        module: step.module.trim() || undefined,
        sortOrder: index + 1,
      }))
      .filter((step) => step.title.length > 0)

    if (!draft.name.trim()) {
      setFormError('프로세스 이름을 입력해 주세요.')
      return
    }

    if (steps.length === 0) {
      setFormError('최소 한 개 이상의 단계를 정의해 주세요.')
      return
    }

    const triggerDay = draft.triggerDay ? Number.parseInt(draft.triggerDay, 10) : undefined
    const triggerMonth = draft.triggerMonth ? Number.parseInt(draft.triggerMonth, 10) : undefined

    setFormError(null)

    await hubData.createMutation.mutateAsync({
      name: draft.name.trim(),
      frequency: draft.frequency,
      description: draft.description.trim() || undefined,
      triggerDay: Number.isNaN(triggerDay) ? undefined : triggerDay,
      triggerMonth: Number.isNaN(triggerMonth) ? undefined : triggerMonth,
      steps,
    })

    setDraft(createEmptyDraft())
    setShowCreator(false)
  }

  async function handleDeleteProcess() {
    if (!hubData.selectedTemplate) return
    const confirmed = window.confirm(`'${hubData.selectedTemplate.name}' 프로세스를 삭제할까요?`)
    if (!confirmed) return
    await hubData.deleteMutation.mutateAsync(hubData.selectedTemplate.id)
  }

  async function handleToggleProcess() {
    if (!hubData.selectedTemplate) return
    await hubData.toggleMutation.mutateAsync(hubData.selectedTemplate.id)
  }

  async function handlePinKnowledge(link: Omit<RoutineKnowledgeLink, 'id' | 'createdAt'>) {
    await hubData.pinKnowledgeMutation.mutateAsync(link)
  }

  async function handleUnpinKnowledge(linkId: string, templateId: string) {
    await hubData.unpinKnowledgeMutation.mutateAsync({ linkId, templateId })
  }

  return (
    <div className="process-hub">
      <section className="process-hero">
        <div className="process-hero-copy">
          <span className="process-hero-eyebrow">Process Definition</span>
          <h2>업무 절차를 프로세스로 정의하고, 단계와 자동화를 연결하세요</h2>
          <p>
            SAP에서는 절차가 곧 품질이에요. {packDetail.label} 관점의 업무 단계를 표준화하고,
            반복 가능한 루틴과 자동화를 같은 화면에서 정리해 두세요.
          </p>
        </div>
        <div className="process-hero-actions">
          <div className="process-domain-card">
            <span className="process-domain-label">현재 Domain Pack</span>
            <strong>{packDetail.label}</strong>
            <p>{packDetail.description}</p>
          </div>
          <div className="process-hero-button-row">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreator((current) => !current)}
            >
              <Plus size={14} aria-hidden="true" />
              {showCreator ? '작성 닫기' : '새 프로세스'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToKnowledge('knowledge', 'agents')}
            >
              <Bot size={14} aria-hidden="true" />
              자동화 보기
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToKnowledge('knowledge', 'vault')}
            >
              <FolderOpen size={14} aria-hidden="true" />
              관련 문서 보기
            </Button>
          </div>
        </div>
      </section>

      <ProcessEditorModal
        visible={showCreator}
        draft={draft}
        formError={formError}
        onUpdateDraft={updateDraft}
        onUpdateStep={updateStep}
        onAddStep={addStep}
        onRemoveStep={removeStep}
        onSubmit={handleCreateProcess}
        onClose={() => setShowCreator(false)}
        isLoading={hubData.createMutation.isPending}
      />

      <section className="process-summary-grid" aria-label="프로세스 요약">
        <article className="process-summary-card">
          <span className="process-section-eyebrow">Defined</span>
          <strong>{hubData.templates.length}</strong>
          <p>표준화된 프로세스 수</p>
        </article>
        <article className="process-summary-card">
          <span className="process-section-eyebrow">Active</span>
          <strong>{hubData.activeTemplatesCount}</strong>
          <p>현재 활성화된 루틴 템플릿</p>
        </article>
        <article className="process-summary-card">
          <span className="process-section-eyebrow">Modules</span>
          <strong>{hubData.moduleCoverageCount}</strong>
          <p>프로세스에 반영된 업무 모듈</p>
        </article>
        <article className="process-summary-card">
          <span className="process-section-eyebrow">Automation</span>
          <strong>{hubData.agents.length}</strong>
          <p>연결 가능한 에이전트 자산</p>
        </article>
      </section>

      <div className="process-workspace">
        <ProcessListSection
          templates={hubData.templates}
          filteredTemplates={hubData.filteredTemplates}
          selectedId={hubData.selectedProcessId}
          processDetails={hubData.processDetails}
          searchQuery={hubData.searchQuery}
          frequencyFilter={hubData.frequencyFilter}
          isLoading={hubData.isTemplatesLoading}
          onSelect={hubData.setSelectedProcessId}
          onSearchChange={hubData.setSearchQuery}
          onFilterChange={hubData.setFrequencyFilter}
          onShowCreator={() => setShowCreator(true)}
        />

        <div>
          <ProcessDetailSection
            selectedTemplate={hubData.selectedTemplate}
            selectedSteps={hubData.selectedSteps}
            selectedExecutions={hubData.selectedExecutions}
            recommendedAgents={hubData.recommendedAgents}
            onToggle={handleToggleProcess}
            onDelete={handleDeleteProcess}
            onNavigate={navigateToKnowledge}
            toggleLoading={hubData.toggleMutation.isPending}
            deleteLoading={hubData.deleteMutation.isPending}
          />

          <RelatedKnowledgePanel
            selectedTemplate={hubData.selectedTemplate}
            selectedSteps={hubData.selectedSteps}
            pinnedKnowledge={hubData.pinnedKnowledge}
            pinnedKnowledgeMap={hubData.pinnedKnowledgeMap}
            relatedKnowledge={hubData.relatedKnowledge}
            knowledgeCandidates={hubData.knowledgeCandidates}
            isLoading={hubData.isLoadingRelatedKnowledge}
            onPin={handlePinKnowledge}
            onUnpin={handleUnpinKnowledge}
            onNavigate={navigateToKnowledge}
            pinLoading={hubData.pinKnowledgeMutation.isPending}
            unpinLoading={hubData.unpinKnowledgeMutation.isPending}
          />
        </div>
      </div>
    </div>
  )
}
