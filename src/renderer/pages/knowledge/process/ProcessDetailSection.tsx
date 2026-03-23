import { ArrowRight, Bot, Clock, Trash2 } from 'lucide-react'
import type {
  AgentDefinition,
  RoutineExecution,
  RoutineTemplate,
  RoutineTemplateStep,
} from '../../../../main/contracts.js'
import type { AppSection } from '../../../stores/appShellStore.js'
import { Button } from '../../../components/ui/Button.js'
import { Badge } from '../../../components/ui/Badge.js'
import { categoryLabel, durationLabel, formatTrigger, frequencyLabel, summarizeModules } from './useProcessHub.js'

interface ProcessDetailSectionProps {
  selectedTemplate: RoutineTemplate | null
  selectedSteps: RoutineTemplateStep[]
  selectedExecutions: RoutineExecution[]
  recommendedAgents: AgentDefinition[]
  onToggle: () => void
  onDelete: () => void
  onNavigate: (section: AppSection, subsection?: string | null) => void
  toggleLoading?: boolean
  deleteLoading?: boolean
}

export function ProcessDetailSection({
  selectedTemplate,
  selectedSteps,
  selectedExecutions,
  recommendedAgents,
  onToggle,
  onDelete,
  onNavigate,
  toggleLoading,
  deleteLoading,
}: ProcessDetailSectionProps) {
  if (!selectedTemplate) {
    return (
      <section className="process-detail-panel" aria-label="프로세스 상세">
        <div className="process-empty-state process-empty-state-detail">
          <strong>프로세스를 선택해 주세요</strong>
          <p>좌측에서 프로세스를 고르면 단계, 자동화, 최근 실행 흐름을 함께 볼 수 있어요.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="process-detail-panel" aria-label="프로세스 상세">
      <div className="process-detail-header">
        <div>
          <span className="process-section-eyebrow">Process Detail</span>
          <h3>{selectedTemplate.name}</h3>
          <p>{selectedTemplate.description ?? '설명이 아직 없어요. 프로세스 목적을 한 줄로 추가해 보세요.'}</p>
        </div>
        <div className="process-detail-actions">
          <Badge variant="info">{frequencyLabel(selectedTemplate.frequency)}</Badge>
          <Badge variant={selectedTemplate.isActive ? 'success' : 'neutral'}>
            {selectedTemplate.isActive ? '활성' : '비활성'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            loading={toggleLoading}
          >
            {selectedTemplate.isActive ? '비활성화' : '활성화'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            loading={deleteLoading}
          >
            <Trash2 size={14} aria-hidden="true" />
            삭제
          </Button>
        </div>
      </div>

      <div className="process-detail-highlight">
        <div>
          <span className="process-highlight-label">실행 기준</span>
          <strong>{formatTrigger(selectedTemplate)}</strong>
        </div>
        <div>
          <span className="process-highlight-label">모듈 범위</span>
          <strong>{summarizeModules(selectedSteps)}</strong>
        </div>
      </div>

      <div className="process-detail-grid">
        <article className="process-detail-section">
          <div className="process-detail-section-header">
            <span className="process-section-eyebrow">Steps</span>
            <h4>{selectedSteps.length}개 단계</h4>
          </div>
          {selectedSteps.length === 0 ? (
            <p className="process-detail-empty">아직 단계 상세를 불러오지 못했어요.</p>
          ) : (
            <ol className="process-steps-list">
              {selectedSteps.map((step, index) => (
                <li key={step.id} className="process-step-card">
                  <div className="process-step-number">{index + 1}</div>
                  <div>
                    <div className="process-step-title-row">
                      <strong>{step.title}</strong>
                      {step.module && <Badge variant="neutral">{step.module}</Badge>}
                    </div>
                    <p>{step.description ?? '설명 없이 정의된 단계예요.'}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="process-detail-section">
          <div className="process-detail-section-header">
            <span className="process-section-eyebrow">Automation</span>
            <h4>연결 가능한 에이전트</h4>
          </div>
          {recommendedAgents.length === 0 ? (
            <p className="process-detail-empty">현재 Domain Pack에 연결된 에이전트가 없어요.</p>
          ) : (
            <div className="process-agent-list">
              {recommendedAgents.map((agent) => (
                <div key={agent.id} className="process-agent-card">
                  <div className="process-agent-card-header">
                    <div>
                      <strong>{agent.title}</strong>
                      <p>{agent.description}</p>
                    </div>
                    <Badge variant="warning">{categoryLabel(agent.category)}</Badge>
                  </div>
                  <div className="process-agent-meta">
                    <span><Clock size={12} aria-hidden="true" /> {durationLabel(agent.estimatedDuration)}</span>
                    <span><Bot size={12} aria-hidden="true" /> {agent.steps.length}개 스텝</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="process-inline-link"
            onClick={() => onNavigate('knowledge', 'agents')}
          >
            에이전트 탭에서 상세 보기
            <ArrowRight size={14} aria-hidden="true" />
          </Button>
        </article>
      </div>

      <article className="process-detail-section process-detail-section-wide">
        <div className="process-detail-section-header">
          <span className="process-section-eyebrow">Recent Execution</span>
          <h4>최근 실행 흐름</h4>
        </div>
        {selectedExecutions.length === 0 ? (
          <p className="process-detail-empty">이 프로세스의 실행 이력이 아직 없어요.</p>
        ) : (
          <div className="process-history-list">
            {selectedExecutions.map((execution) => (
              <div key={execution.id} className="process-history-card">
                <div className="process-history-title">
                  <Clock size={14} aria-hidden="true" />
                  <strong>{execution.executionDate}</strong>
                </div>
                <div className="process-history-meta">
                  <span>Plan ID: {execution.planId}</span>
                  <span>생성일 {new Date(execution.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}
