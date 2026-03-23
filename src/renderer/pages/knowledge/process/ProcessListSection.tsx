import { ArrowRight, Plus } from 'lucide-react'
import type { RoutineFrequency, RoutineTemplate, RoutineTemplateStep } from '../../../../main/contracts.js'
import { Button } from '../../../components/ui/Button.js'
import { Badge } from '../../../components/ui/Badge.js'
import { ProcessFilterBar } from './ProcessFilterBar.js'
import { formatTrigger, frequencyLabel, summarizeModules } from './useProcessHub.js'

type ProcessFrequencyFilter = 'all' | 'active' | RoutineFrequency

interface ProcessDetail {
  template: RoutineTemplate
  steps: RoutineTemplateStep[]
}

interface ProcessListSectionProps {
  templates: RoutineTemplate[]
  filteredTemplates: RoutineTemplate[]
  selectedId: string | null
  processDetails: Map<string, ProcessDetail>
  searchQuery: string
  frequencyFilter: ProcessFrequencyFilter
  isLoading: boolean
  onSelect: (id: string) => void
  onSearchChange: (query: string) => void
  onFilterChange: (filter: ProcessFrequencyFilter) => void
  onShowCreator: () => void
}

export function ProcessListSection({
  filteredTemplates,
  selectedId,
  processDetails,
  searchQuery,
  frequencyFilter,
  isLoading,
  onSelect,
  onSearchChange,
  onFilterChange,
  onShowCreator,
}: ProcessListSectionProps) {
  return (
    <section className="process-list-panel" aria-label="프로세스 목록">
      <div className="process-panel-header">
        <div>
          <span className="process-section-eyebrow">Process Library</span>
          <h3>정의된 프로세스</h3>
          <p>검색과 빈도 기준으로 업무 절차를 빠르게 정리할 수 있어요.</p>
        </div>
      </div>

      <ProcessFilterBar
        searchQuery={searchQuery}
        frequencyFilter={frequencyFilter}
        onSearchChange={onSearchChange}
        onFilterChange={onFilterChange}
      />

      {isLoading ? (
        <div className="process-empty-state">프로세스를 불러오는 중이에요...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="process-empty-state">
          <strong>정의된 프로세스가 없어요</strong>
          <p>루틴 템플릿을 프로세스로 정리해 두면 업무 흐름을 재사용하기 쉬워져요.</p>
          <Button variant="primary" size="sm" onClick={onShowCreator}>
            <Plus size={14} aria-hidden="true" />
            첫 프로세스 만들기
          </Button>
        </div>
      ) : (
        <div className="process-card-list">
          {filteredTemplates.map((template) => {
            const detail = processDetails.get(template.id)
            const stepCount = detail?.steps.length ?? 0
            const modules = detail ? summarizeModules(detail.steps) : '단계 로딩 중'
            const isSelected = template.id === selectedId

            return (
              <button
                key={template.id}
                type="button"
                className={`process-card ${isSelected ? 'active' : ''}`}
                onClick={() => onSelect(template.id)}
              >
                <div className="process-card-header">
                  <div>
                    <h4>{template.name}</h4>
                    <p>{template.description ?? '설명이 아직 없어요.'}</p>
                  </div>
                  <Badge variant={template.isActive ? 'success' : 'neutral'}>
                    {template.isActive ? '활성' : '비활성'}
                  </Badge>
                </div>
                <div className="process-card-meta">
                  <Badge variant="info">{frequencyLabel(template.frequency)}</Badge>
                  <span>{stepCount}개 단계</span>
                  <span>{modules}</span>
                </div>
                <div className="process-card-footer">
                  <span>{formatTrigger(template)}</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
