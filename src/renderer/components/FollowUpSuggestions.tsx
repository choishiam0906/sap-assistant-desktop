import './FollowUpSuggestions.css'

interface FollowUpSuggestionsProps {
  suggestions: string[]
  onSelect: (question: string) => void
  loading?: boolean
}

export function FollowUpSuggestions({ suggestions, onSelect, loading = false }: FollowUpSuggestionsProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="follow-up-suggestions">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          className="follow-up-chip"
          onClick={() => onSelect(suggestion)}
          disabled={loading}
          title={suggestion}
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}
