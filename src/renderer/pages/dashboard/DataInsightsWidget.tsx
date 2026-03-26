import { useState, useEffect, useCallback } from 'react'
import { Database, RefreshCw, ArrowRight, BarChart3, TrendingUp } from 'lucide-react'
import { useAppShellStore } from '../../stores/appShellStore'
import './widgets.css'

const api = (window as unknown as { assistantDesktop: Record<string, unknown> }).assistantDesktop as {
  dataPlatformList: () => Promise<DataPlatformSource[]>
  listConfiguredSources: () => Promise<ConfiguredSource[]>
}

interface DataPlatformSource {
  id: string
  title: string
  kind: string
  syncStatus: string
  documentCount: number
  lastIndexedAt: string | null
}

interface ConfiguredSource {
  id: string
  title: string
  kind: string
  syncStatus: string
  documentCount: number
}

interface SourceSummary {
  kind: string
  count: number
  totalDocs: number
}

/**
 * 데이터 인사이트 위젯 — 연결된 데이터 소스 현황 + 간단한 막대 차트
 */
export function DataInsightsWidget() {
  const setSection = useAppShellStore((s) => s.setSection)
  const [summaries, setSummaries] = useState<SourceSummary[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const sources = await api.listConfiguredSources()
      // kind별 집계
      const map = new Map<string, SourceSummary>()
      for (const s of sources) {
        const existing = map.get(s.kind) ?? { kind: s.kind, count: 0, totalDocs: 0 }
        existing.count += 1
        existing.totalDocs += s.documentCount ?? 0
        map.set(s.kind, existing)
      }
      setSummaries(Array.from(map.values()).sort((a, b) => b.totalDocs - a.totalDocs))
    } catch {
      // 무시
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const totalDocs = summaries.reduce((sum, s) => sum + s.totalDocs, 0)
  const totalSources = summaries.reduce((sum, s) => sum + s.count, 0)
  const maxDocs = Math.max(...summaries.map((s) => s.totalDocs), 1)

  const kindLabels: Record<string, string> = {
    'local-folder': '로컬 폴더',
    'api': 'GitHub',
    'mcp': 'MCP',
    'data-platform': 'Data Platform',
  }

  const kindColors: Record<string, string> = {
    'local-folder': 'var(--color-info)',
    'api': 'var(--color-success)',
    'mcp': 'var(--color-warning)',
    'data-platform': 'var(--color-primary)',
  }

  return (
    <div className="dashboard-widget">
      <div className="dashboard-widget-header">
        <h3><Database size={16} style={{ marginRight: 6, verticalAlign: -2 }} />데이터 인사이트</h3>
        <button className="dashboard-widget-more" onClick={loadData} title="새로고침">
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* 요약 통계 */}
      <div className="data-insight-summary">
        <div className="data-insight-stat">
          <BarChart3 size={16} />
          <span className="data-insight-stat-value">{totalSources}</span>
          <span className="data-insight-stat-label">소스</span>
        </div>
        <div className="data-insight-stat">
          <TrendingUp size={16} />
          <span className="data-insight-stat-value">{totalDocs.toLocaleString()}</span>
          <span className="data-insight-stat-label">문서</span>
        </div>
      </div>

      {/* 소스별 막대 차트 */}
      {summaries.length > 0 ? (
        <div className="data-insight-chart">
          {summaries.map((s) => (
            <div key={s.kind} className="data-insight-bar-row">
              <span className="data-insight-bar-label">
                {kindLabels[s.kind] ?? s.kind}
              </span>
              <div className="data-insight-bar-track">
                <div
                  className="data-insight-bar-fill"
                  style={{
                    width: `${Math.max((s.totalDocs / maxDocs) * 100, 4)}%`,
                    backgroundColor: kindColors[s.kind] ?? 'var(--color-text-muted)',
                  }}
                />
              </div>
              <span className="data-insight-bar-value">{s.totalDocs}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="widget-empty">
          {loading ? '로딩 중...' : '연결된 데이터 소스가 없어요.'}
        </p>
      )}

      <button
        className="dashboard-widget-more"
        style={{ marginTop: 'var(--spacing-xs)' }}
        onClick={() => setSection('knowledge', 'process')}
      >
        Knowledge Hub에서 보기 <ArrowRight size={14} />
      </button>
    </div>
  )
}
