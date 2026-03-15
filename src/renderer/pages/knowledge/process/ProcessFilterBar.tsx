import { Search } from 'lucide-react'
import type { RoutineFrequency } from '../../../../main/contracts.js'

type ProcessFrequencyFilter = 'all' | 'active' | RoutineFrequency

const PROCESS_FILTERS: { value: ProcessFrequencyFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '활성' },
  { value: 'daily', label: '일간' },
  { value: 'monthly', label: '월간' },
  { value: 'yearly', label: '연간' },
]

interface ProcessFilterBarProps {
  searchQuery: string
  frequencyFilter: ProcessFrequencyFilter
  onSearchChange: (query: string) => void
  onFilterChange: (filter: ProcessFrequencyFilter) => void
}

export function ProcessFilterBar({
  searchQuery,
  frequencyFilter,
  onSearchChange,
  onFilterChange,
}: ProcessFilterBarProps) {
  return (
    <div className="process-toolbar">
      <label className="process-search-field">
        <Search size={14} aria-hidden="true" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="프로세스, 단계, 모듈 검색"
          aria-label="프로세스 검색"
        />
      </label>

      <div className="process-filter-row" role="tablist" aria-label="프로세스 필터">
        {PROCESS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`process-filter-pill ${frequencyFilter === filter.value ? 'active' : ''}`}
            onClick={() => onFilterChange(filter.value)}
            aria-pressed={frequencyFilter === filter.value}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  )
}
