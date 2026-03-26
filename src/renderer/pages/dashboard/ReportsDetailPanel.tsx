import { useState, useEffect, useCallback } from 'react'
import { Eye, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { ReportViewer } from '../../components/reports/ReportViewer'
import '../ReportsPage.css'

const api = (window as unknown as { assistantDesktop: Record<string, unknown> }).assistantDesktop as {
  reportTemplatesList: () => Promise<ReportTemplate[]>
  reportTemplatesDelete: (id: string) => Promise<boolean>
  reportGenerate: (p: { templateId: string; provider: string; model: string; query?: string }) => Promise<{ run: unknown; report: Report }>
  reportRunsList: (templateId?: string, limit?: number) => Promise<ReportRun[]>
}

interface TemplateSectionDef {
  title: string
  prompt: string
  dataSource?: string
}

interface ReportTemplate {
  id: string
  title: string
  description?: string
  sections: TemplateSectionDef[]
  outputFormat: string
  createdAt: string
  updatedAt: string
}

interface ReportSection {
  title: string
  content: string
  sources?: Array<{ title: string; path?: string }>
}

interface Report {
  id: string
  templateId: string
  title: string
  sections: ReportSection[]
  generatedAt: string
}

interface ReportRun {
  id: string
  templateId: string
  status: string
  resultJson?: string
  startedAt?: string
  completedAt?: string
}

type ViewMode = 'list' | 'viewer'

export function ReportsDetailPanel() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [runs, setRuns] = useState<ReportRun[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [activeReport, setActiveReport] = useState<Report | null>(null)
  const [generating, setGenerating] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [tpl, runList] = await Promise.all([
        api.reportTemplatesList(),
        api.reportRunsList(undefined, 20),
      ])
      setTemplates(tpl)
      setRuns(runList)
    } catch (err) {
      console.error('리포트 데이터 로드 실패:', err)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleGenerate = async (template: ReportTemplate) => {
    setGenerating(true)
    try {
      const result = await api.reportGenerate({
        templateId: template.id,
        provider: 'openai',
        model: 'gpt-4o',
        query: template.description,
      })
      setActiveReport(result.report)
      setViewMode('viewer')
      loadData()
    } catch (err) {
      console.error('리포트 생성 실패:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    try {
      await api.reportTemplatesDelete(id)
      loadData()
    } catch (err) {
      console.error('템플릿 삭제 실패:', err)
    }
  }

  const handleViewRun = (run: ReportRun) => {
    if (run.resultJson) {
      try {
        const report = JSON.parse(run.resultJson) as Report
        setActiveReport(report)
        setViewMode('viewer')
      } catch { /* empty */ }
    }
  }

  if (viewMode === 'viewer' && activeReport) {
    return (
      <div className="reports-page">
        <div className="reports-viewer-nav">
          <Button variant="ghost" size="sm" onClick={() => setViewMode('list')}>
            ← 목록으로
          </Button>
        </div>
        <ReportViewer report={activeReport} />
      </div>
    )
  }

  return (
    <div className="reports-page">
      <PageHeader
        title="리포트"
        description="AI가 사내 문서를 분석하여 구조화된 리포트를 자동 생성해요"
      />

      <section className="reports-section">
        <div className="reports-section-header">
          <h2>리포트 템플릿</h2>
        </div>
        {templates.length === 0 ? (
          <p className="reports-empty">등록된 템플릿이 없어요. 프리셋 템플릿이 자동으로 생성돼요.</p>
        ) : (
          <ul className="reports-template-list">
            {templates.map((tpl) => (
              <li key={tpl.id} className="reports-template-card">
                <div className="reports-template-info">
                  <h3>{tpl.title}</h3>
                  {tpl.description && <p>{tpl.description}</p>}
                  <span className="reports-template-meta">
                    {tpl.sections.length}개 섹션 · {tpl.outputFormat.toUpperCase()}
                  </span>
                </div>
                <div className="reports-template-actions">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleGenerate(tpl)}
                    disabled={generating}
                  >
                    {generating ? '생성 중...' : '생성'}
                  </Button>
                  {!tpl.id.startsWith('preset-') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      aria-label="삭제"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="reports-section">
        <h2>최근 실행 이력</h2>
        {runs.length === 0 ? (
          <p className="reports-empty">아직 생성된 리포트가 없어요.</p>
        ) : (
          <ul className="reports-runs-list">
            {runs.map((run) => (
              <li key={run.id} className="reports-run-item">
                <span className={`reports-run-status reports-run-status--${run.status}`}>
                  {run.status === 'completed' ? '완료' : run.status === 'running' ? '진행 중' : run.status === 'failed' ? '실패' : '대기'}
                </span>
                <span className="reports-run-date">
                  {run.startedAt ? new Date(run.startedAt).toLocaleString('ko-KR') : '-'}
                </span>
                {run.status === 'completed' && (
                  <Button variant="ghost" size="sm" onClick={() => handleViewRun(run)}>
                    <Eye size={14} /> 보기
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
