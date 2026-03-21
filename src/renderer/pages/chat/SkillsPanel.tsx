import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wrench, ShieldCheck, X, FileCode, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react'
import { queryKeys } from '../../hooks/queryKeys.js'
import type { SkillDefinition } from '../../../main/contracts.js'
import { Badge } from '../../components/ui/Badge.js'

const api = window.assistantDesktop

interface SkillsPanelProps {
  onSelectSkill?: (skill: SkillDefinition) => void
}

export function SkillsPanel({ onSelectSkill }: SkillsPanelProps) {
  const [selectedSkill, setSelectedSkill] = useState<SkillDefinition | null>(null)

  const { data: skillPacks = [] } = useQuery({
    queryKey: queryKeys.skills.packs(),
    queryFn: () => api.listSkillPacks(),
    staleTime: 60_000,
  })

  const { data: skills = [] } = useQuery({
    queryKey: queryKeys.skills.all(),
    queryFn: () => api.listSkills(),
    staleTime: 60_000,
  })

  function handleSkillClick(skill: SkillDefinition) {
    setSelectedSkill(skill)
    onSelectSkill?.(skill)
  }

  return (
    <div className="skills-page">
      <div className="skills-hero">
        <div>
          <h1 className="page-title">Skills</h1>
          <p className="skills-copy">
            등록된 Skill을 확인하고, 각 Skill의 상세 정보를 살펴볼 수 있습니다.
          </p>
        </div>
        <div className="skills-badges">
          <Badge variant="success">엔터프라이즈 보호</Badge>
        </div>
      </div>

      <section className="skills-section">
        <div className="skills-section-header">
          <div>
            <span className="skills-eyebrow">Skill Packs</span>
            <h2>활성 Skill Pack</h2>
          </div>
        </div>
        <div className="skills-pack-grid">
          {skillPacks.map((pack) => (
            <article key={pack.id} className="skills-pack-card">
              <div className="skills-pack-header">
                <div>
                  <strong>{pack.title}</strong>
                  <p>{pack.description}</p>
                </div>
                <Badge variant="info">{pack.audience}</Badge>
              </div>
              <div className="skills-pack-meta">
                <Badge variant="neutral">{pack.skillIds.length} skills</Badge>
              </div>
            </article>
          ))}
          {skillPacks.length === 0 && (
            <div className="skills-empty">등록된 Skill Pack이 없습니다.</div>
          )}
        </div>
      </section>

      <section className="skills-section">
        <div className="skills-section-header">
          <div>
            <span className="skills-eyebrow">Curated Skills</span>
            <h2>Skill Catalog</h2>
          </div>
          <div className="skills-filter-group">
            <Badge variant="neutral">{skills.length}개</Badge>
          </div>
        </div>
        <div className="skills-card-grid">
          {skills.map((skill) => (
            <article
              key={skill.id}
              className="skill-card"
              role="button"
              tabIndex={0}
              onClick={() => handleSkillClick(skill)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleSkillClick(skill)
                }
              }}
            >
              <div className="skill-card-header">
                <div>
                  <strong>{skill.title}</strong>
                  <p>{skill.description}</p>
                </div>
                <CheckCircle2 size={16} className="skill-compat-icon" aria-label="사용 가능" />
              </div>
              <div className="skill-card-meta">
                <Badge variant="neutral">{skill.outputFormat}</Badge>
              </div>
              <div className="skill-card-notes">
                <div>
                  <Wrench size={14} aria-hidden="true" />
                  <span>{skill.suggestedInputs[0] ?? '입력 예시 없음'}</span>
                </div>
                {(skill.domainCodes?.length ?? 0) > 0 && (
                  <div>
                    <FileCode size={14} aria-hidden="true" />
                    <span>{skill.domainCodes?.join(', ')}</span>
                  </div>
                )}
              </div>
            </article>
          ))}
          {skills.length === 0 && (
            <div className="skills-empty">등록된 Skill이 없습니다.</div>
          )}
        </div>
      </section>

      {selectedSkill && (
        <div className="skill-modal-backdrop" onClick={() => setSelectedSkill(null)}>
          <div
            className="skill-modal"
            role="dialog"
            aria-label={`${selectedSkill.title} 상세`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="skill-modal-header">
              <div>
                <h2>{selectedSkill.title}</h2>
                <p>{selectedSkill.description}</p>
              </div>
              <button
                type="button"
                className="skill-modal-close"
                onClick={() => setSelectedSkill(null)}
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>

            <div className="skill-modal-body">
              <div className="skill-modal-section">
                <h3>
                  <CheckCircle2 size={14} aria-hidden="true" />
                  호환성
                </h3>
                <div className="skill-modal-compat">
                  <div>
                    <span className="skill-modal-label">Data Type</span>
                    <div className="skills-badges">
                      {selectedSkill.supportedDataTypes.map((dt) => (
                        <Badge key={dt} variant="neutral">{dt}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="skill-modal-section">
                <h3>
                  <Wrench size={14} aria-hidden="true" />
                  입력 예시
                </h3>
                <ul className="skill-modal-list">
                  {selectedSkill.suggestedInputs.map((input) => (
                    <li key={input}>{input}</li>
                  ))}
                </ul>
              </div>

              {(selectedSkill.domainCodes?.length ?? 0) > 0 && (
                <div className="skill-modal-section">
                  <h3>
                    <FileCode size={14} aria-hidden="true" />
                    관련 T-Code
                  </h3>
                  <div className="skills-badges">
                    {selectedSkill.domainCodes?.map((tcode) => (
                      <Badge key={tcode} variant="info">{tcode}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="skill-modal-section">
                <h3>
                  <BookOpen size={14} aria-hidden="true" />
                  필요 소스
                </h3>
                <div className="skills-badges">
                  {selectedSkill.requiredSources.map((src) => (
                    <Badge key={src} variant="neutral">{src}</Badge>
                  ))}
                </div>
              </div>

              <div className="skill-modal-section">
                <h3>
                  <ShieldCheck size={14} aria-hidden="true" />
                  출력 형식
                </h3>
                <Badge variant="info">{selectedSkill.outputFormat}</Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
