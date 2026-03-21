import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Code2, AlertTriangle, CheckCircle2, Clock, FileCode } from 'lucide-react'
import { queryKeys } from '../../hooks/queryKeys.js'
import './CodeAnalysisPage.css'

const api = window.assistantDesktop

interface CodeAnalysisRisk {
  severity: 'high' | 'medium' | 'low'
  title: string
  detail: string
  line?: number
}

interface CodeAnalysisRecommendation {
  title: string
  detail: string
  priority: 'high' | 'medium' | 'low'
}

interface CodeAnalysisRun {
  id: string
  sourceId: string
  status: 'running' | 'completed' | 'failed'
  totalFiles: number
  analyzedFiles: number
  risksFound: number
  startedAt: string
  completedAt?: string
}

interface CodeAnalysisResult {
  id: string
  runId: string
  documentId: string
  filePath: string
  language?: string
  risks: CodeAnalysisRisk[]
  recommendations: CodeAnalysisRecommendation[]
  complexityScore?: number
  analyzedAt: string
}

export function CodeAnalysisPage() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const { data: runs = [], isLoading } = useQuery({
    queryKey: queryKeys.codeAnalysis.runs(),
    queryFn: () => api.codeAnalysisRunsList(),
    staleTime: 30_000,
  })

  const { data: runDetail } = useQuery({
    queryKey: queryKeys.codeAnalysis.runDetail(selectedRunId),
    queryFn: () => selectedRunId ? api.codeAnalysisRunDetail(selectedRunId) : null,
    enabled: !!selectedRunId,
    staleTime: 10_000,
  })

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString('ko-KR')
    } catch {
      return iso
    }
  }

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 size={14} />
    if (status === 'failed') return <AlertTriangle size={14} />
    return <Clock size={14} />
  }

  return (
    <div className="code-analysis-page">
      <div className="code-analysis-hero">
        <div>
          <h1 className="page-title">Code Analysis</h1>
          <p className="code-analysis-copy">
            MCP Source로 색인된 코드의 품질/리스크 분석 결과를 확인하세요.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>분석 이력을 불러오는 중...</p>
      ) : (runs as CodeAnalysisRun[]).length === 0 ? (
        <div className="code-analysis-empty">
          <Code2 size={48} strokeWidth={1} />
          <h3>분석 이력이 없어요</h3>
          <p>Knowledge → 코드 랩 → Sources에서 MCP 소스를 연결한 후 분석을 실행하세요.</p>
        </div>
      ) : (
        <div className="code-analysis-runs">
          {(runs as CodeAnalysisRun[]).map((run) => (
            <article
              key={run.id}
              className="code-analysis-run-card"
              onClick={() => setSelectedRunId(run.id === selectedRunId ? null : run.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedRunId(run.id === selectedRunId ? null : run.id)}
            >
              <div className="run-card-header">
                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                  분석 #{run.id.slice(0, 8)}
                </span>
                <span className={`run-card-status ${run.status}`}>
                  {statusIcon(run.status)}
                  {run.status === 'completed' ? '완료' : run.status === 'running' ? '진행 중' : '실패'}
                </span>
              </div>
              <div className="run-card-stats">
                <span>파일: {run.analyzedFiles}/{run.totalFiles}</span>
                <span>리스크: {run.risksFound}건</span>
                <span>{formatDate(run.startedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 선택된 Run 상세 */}
      {selectedRunId && runDetail && (
        <div className="run-detail-section">
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-3)' }}>
            분석 결과 상세
          </h2>
          {(runDetail as { results: CodeAnalysisResult[] }).results?.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              분석 결과가 없습니다.
            </p>
          ) : (
            (runDetail as { results: CodeAnalysisResult[] }).results?.map((result: CodeAnalysisResult) => (
              <div key={result.id} className="result-card">
                <div className="result-card-header">
                  <span className="result-file-path">
                    <FileCode size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {result.filePath}
                  </span>
                  {result.language && <span className="result-language">{result.language}</span>}
                </div>

                {result.complexityScore != null && (
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-2)' }}>
                    복잡도: {result.complexityScore.toFixed(1)}/1.0
                  </div>
                )}

                {result.risks.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-1)', marginBottom: 'var(--spacing-2)' }}>
                    {result.risks.map((risk, i) => (
                      <span key={i} className={`risk-badge ${risk.severity}`} title={risk.detail}>
                        {risk.title}
                      </span>
                    ))}
                  </div>
                )}

                {result.recommendations.length > 0 && (
                  <ul style={{ margin: 0, padding: '0 0 0 var(--spacing-4)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                    {result.recommendations.slice(0, 3).map((rec, i) => (
                      <li key={i}>{rec.title}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
