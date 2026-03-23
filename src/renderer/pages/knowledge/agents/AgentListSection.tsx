import { Bot, Pencil, Trash2 } from 'lucide-react'
import type { AgentDefinition } from '../../../../main/contracts.js'
import { Badge } from '../../../components/ui/Badge.js'
import { categoryLabel, durationLabel } from './utils.js'

interface AgentListSectionProps {
  agents: AgentDefinition[]
  selectedId: string | null
  onSelect: (agentId: string) => void
  onEdit: (agent: AgentDefinition) => void
  onDelete: (agentId: string) => void
}

export function AgentListSection({
  agents,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: AgentListSectionProps) {
  const presetAgents = agents.filter((a) => !a.isCustom)
  const customAgents = agents.filter((a) => a.isCustom)

  return (
    <section>
      {/* 프리셋 에이전트 */}
      {presetAgents.length > 0 && <div className="agents-section-label">프리셋</div>}
      <div className="agents-card-list">
        {agents.length === 0 && (
          <div className="agents-empty">
            현재 Domain Pack에 호환되는 에이전트가 없습니다.
          </div>
        )}
        {presetAgents.map((agent) => (
          <article
            key={agent.id}
            className={`agent-card ${selectedId === agent.id ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(agent.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(agent.id)
              }
            }}
          >
            <div className="agent-card-header">
              <div>
                <strong>
                  <Bot
                    size={14}
                    style={{ verticalAlign: 'text-bottom', marginRight: 6 }}
                    aria-hidden="true"
                  />
                  {agent.title}
                </strong>
                <p>{agent.description}</p>
              </div>
            </div>
            <div className="agent-card-meta">
              <Badge variant="info">{categoryLabel(agent.category)}</Badge>
              <Badge variant="neutral">{durationLabel(agent.estimatedDuration)}</Badge>
              <Badge variant="neutral">{agent.steps.length} steps</Badge>
            </div>
          </article>
        ))}
      </div>

      {/* 커스텀 에이전트 */}
      {customAgents.length > 0 && (
        <>
          <div className="agents-section-label" style={{ marginTop: 16 }}>
            내가 만든 에이전트
          </div>
          <div className="agents-card-list">
            {customAgents.map((agent) => (
              <article
                key={agent.id}
                className={`agent-card agent-card--custom ${
                  selectedId === agent.id ? 'active' : ''
                }`}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(agent.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(agent.id)
                  }
                }}
              >
                <div className="agent-card-header">
                  <div>
                    <strong>
                      <Bot
                        size={14}
                        style={{ verticalAlign: 'text-bottom', marginRight: 6 }}
                        aria-hidden="true"
                      />
                      {agent.title}
                    </strong>
                    <p>{agent.description}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="agent-card-action-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(agent)
                      }}
                      aria-label="편집"
                      title="편집"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      className="agent-card-action-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(agent.id)
                      }}
                      aria-label="삭제"
                      title="삭제"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="agent-card-meta">
                  <Badge variant="info">{categoryLabel(agent.category)}</Badge>
                  <Badge variant="warning">커스텀</Badge>
                  <Badge variant="neutral">{agent.steps.length} steps</Badge>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
