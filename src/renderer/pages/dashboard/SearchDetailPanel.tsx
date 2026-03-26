import { useState, useCallback } from 'react'
import { Search, FileText } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import '../SearchPage.css'

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

export function SearchDetailPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await api.searchHybrid({ query: query.trim(), topK: 20 })
      setResults(res)
      setSearched(true)
    } catch (err) {
      console.error('검색 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="search-page">
      <PageHeader
        title="AI 검색"
        description="사내 문서를 벡터 + 키워드 하이브리드 검색으로 찾아보세요"
      />

      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-input-icon" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="검색어를 입력하세요 (예: 엑셀 업로드 에러)"
            className="search-input"
          />
        </div>
        <Button
          variant="primary"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
        >
          {loading ? '검색 중...' : '검색'}
        </Button>
      </div>

      {searched && results.length === 0 && (
        <div className="search-empty">
          <p>검색 결과가 없어요. 다른 키워드로 시도해보세요.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="search-results">
          <p className="search-results-count">
            {results.length}건의 결과
          </p>
          <ul className="search-results-list">
            {results.map((result) => (
              <li key={result.chunkId} className="search-result-card">
                <div className="search-result-header">
                  <FileText size={16} />
                  <span className="search-result-title">
                    {result.documentTitle || result.relativePath || '알 수 없는 문서'}
                  </span>
                  <span className="search-result-score">
                    유사도 {Math.round(result.score * 100)}%
                  </span>
                  <span className={`search-result-type search-result-type--${result.searchType}`}>
                    {result.searchType}
                  </span>
                </div>
                {result.relativePath && (
                  <p className="search-result-path">{result.relativePath}</p>
                )}
                <p className="search-result-text">{result.chunkText}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
