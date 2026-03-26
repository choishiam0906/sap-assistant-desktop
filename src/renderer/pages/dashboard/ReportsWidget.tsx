import { useState, useEffect, useCallback } from 'react'
import { FileBarChart, ArrowRight } from 'lucide-react'
import { useAppShellStore } from '../../stores/appShellStore'
import { Button } from '../../components/ui/Button'
import './widgets.css'

const api = (window as unknown as { assistantDesktop: Record<string, unknown> }).assistantDesktop as {
  reportTemplatesList: () => Promise<ReportTemplate[]>
  reportGenerate: (p: { templateId: string; provider: string; model: string; query?: string }) => Promise<unknown>
  reportRunsList: (templateId?: string, limit?: number) => Promise<ReportRun[]>
}

interface ReportTemplate {
  id: string
  title: string
  description?: string
  sections: Array<{ title: string; prompt: string }>
  outputFormat: string
  createdAt: string
  updatedAt: string
}

interface ReportRun {
  id: string
  templateId: string
  status: string
  startedAt?: string
  completedAt?: string
}

const QUICK_PRESETS = 6
const PRESET_IDS = [
  "preset-error-analysis",
  "preset-weekly-ops",
  "preset-system-health",
  "preset-operational-decision",
  "preset-incident-analysis",
  "preset-cost-performance",
];

export function ReportsWidget() {
  const setSection = useAppShellStore((s) => s.setSection)
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [runs, setRuns] = useState<ReportRun[]>([])
  const [generating, setGenerating] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [tpl, runList] = await Promise.all([
        api.reportTemplatesList(),
        api.reportRunsList(undefined, 3),
      ])
      setTemplates(tpl)
      setRuns(runList)
    } catch (err) {
      console.error('리포트 데이터 로드 실패:', err)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleQuickGenerate = async (tpl: ReportTemplate) => {
    setGenerating(true)
    try {
      await api.reportGenerate({
        templateId: tpl.id,
        provider: 'openai',
        model: 'gpt-4o',
        query: tpl.description,
      })
      loadData()
    } catch (err) {
      console.error('리포트 생성 실패:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="dashboard-widget">
      <div className="dashboard-widget-header">
        <h3>리포트</h3>
        <button
          className="dashboard-widget-more"
          onClick={() => setSection('dashboard', 'reports')}
        >
          더보기 <ArrowRight size={14} />
        </button>
      </div>

      {templates.length > 0 && (
        <div className="widget-quick-actions">
          <span className="widget-label">빠른 생성:</span>
          <div className="widget-quick-buttons">
            {templates
              .filter((t) => PRESET_IDS.includes(t.id))
              .map((tpl) => (
                <Button
                  key={tpl.id}
                  variant="secondary"
                  size="sm"
                  disabled={generating}
                  onClick={() => handleQuickGenerate(tpl)}
                  title={tpl.description}
                >
                  {tpl.title}
                </Button>
              ))}
          </div>
        </div>
      )}

      {runs.length > 0 && (
        <div className="widget-runs">
          <span className="widget-label">최근 리포트:</span>
          {runs.map((run) => (
            <div key={run.id} className="widget-run-item">
              <FileBarChart size={14} />
              <span className={`reports-run-status reports-run-status--${run.status}`}>
                {run.status === 'completed' ? '완료' : run.status === 'running' ? '진행 중' : '대기'}
              </span>
              <span className="widget-run-date">
                {run.startedAt ? new Date(run.startedAt).toLocaleDateString('ko-KR') : '-'}
              </span>
            </div>
          ))}
        </div>
      )}

      {templates.length === 0 && runs.length === 0 && (
        <p className="widget-empty">등록된 템플릿이 없어요.</p>
      )}
    </div>
  )
}
