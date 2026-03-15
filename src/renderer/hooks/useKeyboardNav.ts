import { useCallback } from 'react'

interface UseKeyboardNavOptions {
  /** 목록 아이템 총 개수 */
  itemCount: number
  /** 현재 선택된 인덱스 */
  activeIndex: number
  /** 인덱스 변경 콜백 */
  onIndexChange: (index: number) => void
  /** Enter/Space 시 실행 콜백 */
  onSelect?: (index: number) => void
  /** 순환 탐색 여부 (기본: true) */
  wrap?: boolean
}

/**
 * 리스트에서 화살표 키(↑/↓)로 탐색, Enter/Space로 선택하는 키보드 내비게이션 훅.
 * 반환된 onKeyDown을 리스트 컨테이너에 바인딩한다.
 */
export function useKeyboardNav({
  itemCount,
  activeIndex,
  onIndexChange,
  onSelect,
  wrap = true,
}: UseKeyboardNavOptions) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (itemCount === 0) return

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          const next = activeIndex + 1
          onIndexChange(next < itemCount ? next : wrap ? 0 : activeIndex)
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          const prev = activeIndex - 1
          onIndexChange(prev >= 0 ? prev : wrap ? itemCount - 1 : activeIndex)
          break
        }
        case 'Home': {
          e.preventDefault()
          onIndexChange(0)
          break
        }
        case 'End': {
          e.preventDefault()
          onIndexChange(itemCount - 1)
          break
        }
        case 'Enter':
        case ' ': {
          if (onSelect && activeIndex >= 0) {
            e.preventDefault()
            onSelect(activeIndex)
          }
          break
        }
      }
    },
    [itemCount, activeIndex, onIndexChange, onSelect, wrap]
  )

  return { onKeyDown: handleKeyDown }
}
