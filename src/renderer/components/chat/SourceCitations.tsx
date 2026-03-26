import { FileText, ExternalLink } from 'lucide-react'
import './SourceCitations.css'

interface SourceCitation {
  documentId: string
  documentTitle?: string
  relativePath?: string
  chunkText: string
  score: number
}

interface SourceCitationsProps {
  sources: SourceCitation[]
  onViewDocument?: (documentId: string) => void
}

export function SourceCitations({ sources, onViewDocument }: SourceCitationsProps) {
  if (sources.length === 0) return null

  return (
    <div className="source-citations">
      <div className="source-citations-header">
        <FileText size={14} />
        <span>참고 문서 ({sources.length}건)</span>
      </div>
      <ul className="source-citations-list">
        {sources.map((source, i) => (
          <li key={`${source.documentId}-${i}`} className="source-citation-item">
            <button
              className="source-citation-btn"
              onClick={() => onViewDocument?.(source.documentId)}
              title={source.relativePath || source.documentTitle}
            >
              <span className="source-citation-title">
                {source.documentTitle || source.relativePath || '알 수 없는 문서'}
              </span>
              <span className="source-citation-score">
                {Math.round(source.score * 100)}%
              </span>
              <ExternalLink size={12} className="source-citation-icon" />
            </button>
            <p className="source-citation-preview">
              {source.chunkText}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
