import { useState, useCallback } from 'react'
import { Search, FileText, ArrowRight } from 'lucide-react'
import { useAppShellStore } from '../../stores/appShellStore'
import { Input } from '../../components/ui/Input'
import './widgets.css'

const api = (window as unknown as { assistantDesktop: Record<string, unknown> }).assistantDesktop as {
  searchHybrid: (p: { query: string; topK?: number }) => Promise<SearchResult[]>
}

interface SearchResult {
  chunkId: string
  documentId: string
  chunkIndex: number
  chunkText: string
  score: number
  documentTitle?: string
  relativePath?: string
  searchType: string
}

const RECENT_KEY = 'dashboard:recentSearches'
const MAX_RECENT = 5
const PREVIEW_COUNT = 3

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch { return [] }
}

function saveRecentSearch(q: string) {
  const list = getRecentSearches().filter((s) => s !== q)
  list.unshift(q)
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)))
}

export function SearchWidget() {
  const setSection = useAppShellStore((s) => s.setSection)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await api.searchHybrid({ query: query.trim(), topK: PREVIEW_COUNT })
      setResults(res)
      setSearched(true)
      saveRecentSearch(query.trim())
    } catch (err) {
      console.error('검색 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const recent = getRecentSearches()

  return (
    <div className="dashboard-widget">
      <div className="dashboard-widget-header">
        <h3>AI 검색</h3>
        <button
          className="dashboard-widget-more"
          onClick={() => setSection('dashboard', 'search')}
        >
          더보기 <ArrowRight size={14} />
        </button>
      </div>

      <div className="search-bar" style={{ marginBottom: 'var(--spacing-sm)' }}>
        <div className="search-input-wrapper">
          <Search size={18} className="search-input-icon" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="검색어를 입력하세요..."
            className="search-input"
          />
        </div>
      </div>

      {!searched && recent.length > 0 && (
        <div className="widget-recent">
          최근 검색:{' '}
          {recent.map((r, i) => (
            <button
              key={i}
              className="widget-recent-tag"
              onClick={() => { setQuery(r); }}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="widget-loading">검색 중...</p>}

      {searched && results.length === 0 && !loading && (
        <p className="widget-empty">검색 결과가 없어요.</p>
      )}

      {results.length > 0 && (
        <ul className="widget-results">
          {results.map((r) => (
            <li key={r.chunkId} className="widget-result-item">
              <FileText size={14} />
              <span className="search-result-score">
                {Math.round(r.score * 100)}%
              </span>
              <span className="widget-result-title">
                {r.documentTitle || r.relativePath || '알 수 없는 문서'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
