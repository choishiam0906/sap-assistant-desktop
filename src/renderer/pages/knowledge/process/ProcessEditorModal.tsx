import { Plus, Trash2 } from 'lucide-react'
import type { RoutineFrequency } from '../../../../main/contracts.js'
import { Button } from '../../../components/ui/Button.js'
import { Badge } from '../../../components/ui/Badge.js'
import { frequencyDescription } from './useProcessHub.js'

const MODULE_OPTIONS = ['FI', 'CO', 'MM', 'SD', 'PP', 'BC', 'PI', 'BTP']

interface ProcessStepDraft {
  title: string
  description: string
  module: string
}

interface ProcessDraft {
  name: string
  frequency: RoutineFrequency
  description: string
  triggerDay: string
  triggerMonth: string
  steps: ProcessStepDraft[]
}

interface ProcessEditorModalProps {
  visible: boolean
  draft: ProcessDraft
  formError: string | null
  onUpdateDraft: <K extends keyof ProcessDraft>(key: K, value: ProcessDraft[K]) => void
  onUpdateStep: (index: number, key: keyof ProcessStepDraft, value: string) => void
  onAddStep: () => void
  onRemoveStep: (index: number) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
  onClose: () => void
  isLoading?: boolean
}

export function ProcessEditorModal({
  visible,
  draft,
  formError,
  onUpdateDraft,
  onUpdateStep,
  onAddStep,
  onRemoveStep,
  onSubmit,
  onClose,
  isLoading,
}: ProcessEditorModalProps) {
  if (!visible) return null

  return (
    <section className="process-builder" aria-label="새 프로세스 정의">
      <div className="process-builder-header">
        <div>
          <span className="process-section-eyebrow">Process Builder</span>
          <h3>새 프로세스를 정의하세요</h3>
          <p>루틴 템플릿을 기반으로 빈도, 단계, 모듈을 바로 정리할 수 있어요.</p>
        </div>
        <Badge variant="info">{frequencyDescription(draft.frequency)}</Badge>
      </div>

      <form className="process-builder-form" onSubmit={onSubmit}>
        <div className="process-builder-grid">
          <label className="process-field">
            <span>프로세스 이름</span>
            <input
              type="text"
              value={draft.name}
              onChange={(event) => onUpdateDraft('name', event.target.value)}
              placeholder="예: 월마감 전표 검증 프로세스"
            />
          </label>

          <label className="process-field">
            <span>빈도</span>
            <select
              value={draft.frequency}
              onChange={(event) => onUpdateDraft('frequency', event.target.value as RoutineFrequency)}
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>

          {(draft.frequency === 'monthly' || draft.frequency === 'yearly') && (
            <label className="process-field">
              <span>기준 일자</span>
              <input
                type="number"
                min="1"
                max="31"
                value={draft.triggerDay}
                onChange={(event) => onUpdateDraft('triggerDay', event.target.value)}
                placeholder="25"
              />
            </label>
          )}

          {draft.frequency === 'yearly' && (
            <label className="process-field">
              <span>기준 월</span>
              <input
                type="number"
                min="1"
                max="12"
                value={draft.triggerMonth}
                onChange={(event) => onUpdateDraft('triggerMonth', event.target.value)}
                placeholder="12"
              />
            </label>
          )}
        </div>

        <label className="process-field process-field-full">
          <span>설명</span>
          <textarea
            value={draft.description}
            onChange={(event) => onUpdateDraft('description', event.target.value)}
            rows={3}
            placeholder="이 프로세스가 어떤 업무 절차를 표준화하는지 적어 주세요."
          />
        </label>

        <div className="process-steps-builder">
          <div className="process-steps-builder-header">
            <div>
              <span className="process-section-eyebrow">Process Steps</span>
              <h4>단계를 정의하세요</h4>
            </div>
            <Button variant="ghost" size="sm" type="button" onClick={onAddStep}>
              <Plus size={14} aria-hidden="true" />
              단계 추가
            </Button>
          </div>

          {draft.steps.map((step, index) => (
            <div key={`draft-step-${index}`} className="process-step-editor">
              <div className="process-step-editor-index">{index + 1}</div>
              <div className="process-step-editor-fields">
                <label className="process-field">
                  <span>단계 이름</span>
                  <input
                    type="text"
                    value={step.title}
                    onChange={(event) => onUpdateStep(index, 'title', event.target.value)}
                    placeholder="예: 전표 대상 추출"
                  />
                </label>
                <label className="process-field">
                  <span>모듈</span>
                  <select
                    value={step.module}
                    onChange={(event) => onUpdateStep(index, 'module', event.target.value)}
                  >
                    {MODULE_OPTIONS.map((module) => (
                      <option key={module} value={module}>{module}</option>
                    ))}
                  </select>
                </label>
                <label className="process-field process-field-full">
                  <span>단계 설명</span>
                  <textarea
                    rows={2}
                    value={step.description}
                    onChange={(event) => onUpdateStep(index, 'description', event.target.value)}
                    placeholder="실행 기준이나 체크 포인트를 적어 주세요."
                  />
                </label>
              </div>
              <button
                type="button"
                className="process-step-remove"
                onClick={() => onRemoveStep(index)}
                disabled={draft.steps.length === 1}
                aria-label={`단계 ${index + 1} 삭제`}
                title="단계 삭제"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        {formError && <div className="process-form-error">{formError}</div>}

        <div className="process-builder-actions">
          <Button variant="ghost" type="button" onClick={onClose}>
            닫기
          </Button>
          <Button type="submit" loading={isLoading}>
            프로세스 저장
          </Button>
        </div>
      </form>
    </section>
  )
}
