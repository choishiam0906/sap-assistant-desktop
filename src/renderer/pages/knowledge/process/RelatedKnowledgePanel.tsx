import type {
  RoutineKnowledgeLink,
  RoutineTemplate,
  RoutineTemplateStep,
  SourceDocument,
  VaultEntry,
} from '../../../../main/contracts.js'
import { Button } from '../../../components/ui/Button.js'
import { Badge } from '../../../components/ui/Badge.js'
import { buildLinkKey, formatDate } from './useProcessHub.js'

interface RelatedKnowledgeBundle {
  confidentialVault: VaultEntry[]
  referenceVault: VaultEntry[]
  sourceDocuments: SourceDocument[]
}

interface RelatedKnowledgePanelProps {
  selectedTemplate: RoutineTemplate | null
  selectedSteps: RoutineTemplateStep[]
  pinnedKnowledge: RoutineKnowledgeLink[]
  pinnedKnowledgeMap: Map<string, RoutineKnowledgeLink>
  relatedKnowledge: RelatedKnowledgeBundle | undefined
  knowledgeCandidates: string[]
  isLoading: boolean
  onPin: (link: Omit<RoutineKnowledgeLink, 'id' | 'createdAt'>) => Promise<void>
  onUnpin: (linkId: string, templateId: string) => Promise<void>
  onNavigate: (section: string, subsection?: string) => void
  pinLoading?: boolean
  unpinLoading?: boolean
}

export function RelatedKnowledgePanel({
  selectedTemplate,
  pinnedKnowledge,
  pinnedKnowledgeMap,
  relatedKnowledge,
  knowledgeCandidates,
  isLoading,
  onPin,
  onUnpin,
  onNavigate,
  pinLoading,
  unpinLoading,
}: RelatedKnowledgePanelProps) {
  if (!selectedTemplate) return null

  return (
    <article className="process-detail-section process-detail-section-wide">
      <div className="process-detail-section-header">
        <div>
          <span className="process-section-eyebrow">Related Knowledge</span>
          <h4>관련 지식 자산</h4>
        </div>
        <div className="process-knowledge-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('knowledge', 'vault')}
          >
            Vault 보기
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('knowledge', 'code-lab:sources')}
          >
            Code Lab 보기
          </Button>
        </div>
      </div>

      {knowledgeCandidates.length > 0 && (
        <div className="process-knowledge-chip-row">
          {knowledgeCandidates.map((candidate) => (
            <span key={candidate} className="process-knowledge-chip">{candidate}</span>
          ))}
        </div>
      )}

      <div className="process-pinned-section">
        <div className="process-knowledge-column-header">
          <strong>Pinned Knowledge</strong>
          <span>이 프로세스에 명시적으로 연결해 둔 문서와 소스예요.</span>
        </div>
        {pinnedKnowledge.length === 0 ? (
          <p className="process-detail-empty">아직 고정한 자산이 없어요. 아래 추천 자산을 프로세스에 연결해 보세요.</p>
        ) : (
          <div className="process-pinned-list">
            {pinnedKnowledge.map((link) => (
              <div key={link.id} className="process-knowledge-card process-knowledge-card-pinned">
                <div className="process-knowledge-card-header">
                  <div>
                    <strong>{link.title}</strong>
                    <p>{link.excerpt ?? '설명 없이 연결된 자산이에요.'}</p>
                  </div>
                  <div className="process-knowledge-card-actions">
                    <Badge variant={link.targetType === 'vault' ? 'warning' : 'neutral'}>
                      {link.targetType === 'vault' ? 'Vault' : 'Code Lab'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUnpin(link.id, link.templateId)}
                      loading={unpinLoading}
                    >
                      연결 해제
                    </Button>
                  </div>
                </div>
                <div className="process-knowledge-card-meta">
                  {link.classification && <span>{link.classification}</span>}
                  {link.sourceType && <span>{link.sourceType}</span>}
                  {link.location && <span>{link.location}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="process-knowledge-grid">
        <div className="process-knowledge-column">
          <div className="process-knowledge-column-header">
            <strong>Vault</strong>
            <span>프로세스와 맞는 운영 메모와 참조 문서를 보여줘요.</span>
          </div>
          {isLoading ? (
            <p className="process-detail-empty">관련 문서를 찾는 중이에요...</p>
          ) : (
            <div className="process-knowledge-list">
              {[...(relatedKnowledge?.confidentialVault ?? []), ...(relatedKnowledge?.referenceVault ?? [])].length === 0 ? (
                <p className="process-detail-empty">연결된 Vault 문서를 아직 찾지 못했어요.</p>
              ) : (
                [...(relatedKnowledge?.confidentialVault ?? []), ...(relatedKnowledge?.referenceVault ?? [])].map((entry) => (
                  <div key={entry.id} className="process-knowledge-card">
                    <div className="process-knowledge-card-header">
                      <div>
                        <strong>{entry.title}</strong>
                        <p>{entry.excerpt ?? '요약이 없는 문서예요.'}</p>
                      </div>
                      <div className="process-knowledge-card-actions">
                        <Badge variant={entry.classification === 'confidential' ? 'warning' : 'info'}>
                          {entry.classification === 'confidential' ? '기밀' : '공개'}
                        </Badge>
                        <Button
                          variant={pinnedKnowledgeMap.has(buildLinkKey('vault', entry.id)) ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => {
                            const existingLink = pinnedKnowledgeMap.get(buildLinkKey('vault', entry.id))
                            if (existingLink) {
                              void onUnpin(existingLink.id, existingLink.templateId)
                              return
                            }
                            void onPin({
                              templateId: selectedTemplate.id,
                              targetType: 'vault',
                              targetId: entry.id,
                              title: entry.title,
                              excerpt: entry.excerpt ?? undefined,
                              location: entry.filePath ?? undefined,
                              classification: entry.classification,
                              sourceType: entry.sourceType,
                            })
                          }}
                          loading={pinLoading || unpinLoading}
                        >
                          {pinnedKnowledgeMap.has(buildLinkKey('vault', entry.id)) ? '연결 해제' : '프로세스에 연결'}
                        </Button>
                      </div>
                    </div>
                    <div className="process-knowledge-card-meta">
                      <span>{entry.sourceType}</span>
                      {entry.filePath && <span>{entry.filePath}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="process-knowledge-column">
          <div className="process-knowledge-column-header">
            <strong>Code Lab</strong>
            <span>프로세스와 가까운 로컬 소스와 분석 기반 문서를 추천해요.</span>
          </div>
          {isLoading ? (
            <p className="process-detail-empty">관련 소스를 찾는 중이에요...</p>
          ) : relatedKnowledge?.sourceDocuments.length ? (
            <div className="process-knowledge-list">
              {relatedKnowledge.sourceDocuments.map((document) => (
                <div key={document.id} className="process-knowledge-card">
                  <div className="process-knowledge-card-header">
                    <div>
                      <strong>{document.title}</strong>
                      <p>{document.excerpt ?? '발췌 정보가 없는 소스예요.'}</p>
                    </div>
                    <div className="process-knowledge-card-actions">
                      <Badge variant="neutral">{document.classification ?? 'mixed'}</Badge>
                      <Button
                        variant={pinnedKnowledgeMap.has(buildLinkKey('source-document', document.id)) ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          const existingLink = pinnedKnowledgeMap.get(buildLinkKey('source-document', document.id))
                          if (existingLink) {
                            void onUnpin(existingLink.id, existingLink.templateId)
                            return
                          }
                          void onPin({
                            templateId: selectedTemplate.id,
                            targetType: 'source-document',
                            targetId: document.id,
                            title: document.title,
                            excerpt: document.excerpt ?? undefined,
                            location: document.relativePath,
                            classification: document.classification,
                            sourceType: 'local-folder',
                          })
                        }}
                        loading={pinLoading || unpinLoading}
                      >
                        {pinnedKnowledgeMap.has(buildLinkKey('source-document', document.id)) ? '연결 해제' : '프로세스에 연결'}
                      </Button>
                    </div>
                  </div>
                  <div className="process-knowledge-card-meta">
                    <span>{document.relativePath}</span>
                    <span>{formatDate(document.indexedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="process-detail-empty">관련 Code Lab 소스를 아직 찾지 못했어요.</p>
          )}
        </div>
      </div>
    </article>
  )
}
