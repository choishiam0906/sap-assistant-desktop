import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Trash2, ExternalLink, AlertCircle } from 'lucide-react'
import {
  SettingsSection,
  SettingsCard,
  SettingsCardContent,
  SettingsRow,
  SettingsInput,
} from './primitives/index.js'
import './SettingsCodeLabSection.css'

interface ConnectedSource {
  id: string
  title: string
  syncStatus: string
  lastIndexedAt: string | null
  documentCount: number
  connectionMeta: Record<string, string> | null
}

const api = window.assistantDesktop

export function SettingsCodeLabSection() {
  const [repoUrl, setRepoUrl] = useState('')
  const [pat, setPat] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [sources, setSources] = useState<ConnectedSource[]>([])
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const loadSources = useCallback(async () => {
    try {
      const list = await api.githubListSources()
      setSources(list ?? [])
    } catch {
      /* 초기 로드 실패는 무시 */
    }
  }, [])

  useEffect(() => {
    loadSources()
  }, [loadSources])

  const handleConnect = async () => {
    if (!repoUrl.trim()) return
    setConnecting(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const result = await api.githubConnect({
        repoUrl: repoUrl.trim(),
        pat: pat.trim() || undefined,
      })
      const summary = result.summary
      setSuccessMsg(
        `연결 완료! ${summary.indexed}개 파일 인덱싱됨`,
      )
      setRepoUrl('')
      setPat('')
      await loadSources()
    } catch (err) {
      setError(err instanceof Error ? err.message : '연결에 실패했어요')
    } finally {
      setConnecting(false)
    }
  }

  const handleSync = async (sourceId: string) => {
    setSyncingId(sourceId)
    setError(null)
    try {
      const result = await api.githubSync(sourceId)
      const s = result.summary
      setSuccessMsg(
        `동기화 완료 — 신규 ${s.indexed}, 갱신 ${s.updated}, 유지 ${s.unchanged}, 삭제 ${s.removed}`,
      )
      await loadSources()
    } catch (err) {
      setError(err instanceof Error ? err.message : '동기화에 실패했어요')
    } finally {
      setSyncingId(null)
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('ko-KR', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="sp-page page-enter">
      <div className="sp-page-header">
        <h3>CodeLab</h3>
      </div>
      <div className="sp-page-scroll">
        <div className="sp-page-body">
          <div className="sp-page-sections">

            <SettingsSection
              title="GitHub 리포지토리 연결"
              description="시스템 코드를 AI 컨텍스트로 등록하면 에러 진단에 활용돼요"
            >
              <SettingsCard>
                <SettingsCardContent>
                  <SettingsInput
                    label="Repository URL"
                    description="공개 또는 비공개 GitHub 리포지토리 주소"
                    value={repoUrl}
                    onChange={setRepoUrl}
                    placeholder="https://github.com/owner/repo"
                    type="url"
                  />
                  <SettingsInput
                    label="Personal Access Token"
                    description="비공개 리포지토리일 경우에만 필요해요"
                    value={pat}
                    onChange={setPat}
                    placeholder="ghp_xxxxxxxxxxxx"
                    type="password"
                  />
                </SettingsCardContent>
              </SettingsCard>

              <div className="codelab-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleConnect}
                  disabled={connecting || !repoUrl.trim()}
                >
                  {connecting ? '연결 중…' : '리포지토리 연결'}
                </button>
              </div>

              {error && (
                <div className="codelab-message codelab-error" role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="codelab-message codelab-success" role="status">
                  <span>{successMsg}</span>
                </div>
              )}
            </SettingsSection>

            {sources.length > 0 && (
              <SettingsSection title="연결된 리포지토리">
                <SettingsCard>
                  {sources.map((src) => {
                    const meta = src.connectionMeta
                    const repoName = src.title || meta?.repo || src.id
                    const isSyncing = syncingId === src.id
                    const statusLabel =
                      src.syncStatus === 'indexing' ? '인덱싱 중…'
                        : src.syncStatus === 'error' ? '오류'
                          : src.syncStatus === 'ready' ? '준비됨'
                            : '대기'

                    return (
                      <SettingsRow key={src.id} label={repoName}>
                        <div className="codelab-repo-row">
                          <span className={`codelab-status codelab-status--${src.syncStatus}`}>
                            {statusLabel}
                          </span>
                          <span className="codelab-meta">
                            {src.documentCount}개 파일 · {formatDate(src.lastIndexedAt)}
                          </span>
                          <div className="codelab-repo-actions">
                            {meta?.repoUrl && (
                              <a
                                href={meta.repoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-icon"
                                aria-label="GitHub에서 열기"
                                title="GitHub에서 열기"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                            <button
                              className="btn-icon"
                              onClick={() => handleSync(src.id)}
                              disabled={isSyncing}
                              aria-label="동기화"
                              title="동기화"
                            >
                              <RefreshCw size={14} className={isSyncing ? 'spinning' : ''} />
                            </button>
                          </div>
                        </div>
                      </SettingsRow>
                    )
                  })}
                </SettingsCard>
              </SettingsSection>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
