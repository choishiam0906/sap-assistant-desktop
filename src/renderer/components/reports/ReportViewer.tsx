import { FileText } from 'lucide-react'
import './ReportViewer.css'

const api = (window as unknown as { assistantDesktop: Record<string, unknown> }).assistantDesktop as {
  reportExport: (p: { report: unknown; format: string; outputPath: string }) => Promise<{ success: boolean }>
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

interface ReportViewerProps {
  report: Report
}

export function ReportViewer({ report }: ReportViewerProps) {
  return (
    <div className="report-viewer">
      <div className="report-viewer-header">
        <div>
          <h1 className="report-viewer-title">{report.title}</h1>
          <p className="report-viewer-date">
            생성일: {new Date(report.generatedAt).toLocaleString('ko-KR')}
          </p>
        </div>
      </div>

      <div className="report-viewer-body">
        {report.sections.map((section, i) => (
          <section key={i} className="report-viewer-section">
            <h2 className="report-section-title">{section.title}</h2>
            <div className="report-section-content">
              {section.content.split('\n').map((line, j) => (
                <p key={j}>{line || '\u00A0'}</p>
              ))}
            </div>
            {section.sources && section.sources.length > 0 && (
              <div className="report-section-sources">
                <FileText size={12} />
                <span>
                  출처: {section.sources.map((s) => s.title).join(', ')}
                </span>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
