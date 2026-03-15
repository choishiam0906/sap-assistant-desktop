/**
 * 공유 유틸리티 함수 — LocalFolder와 MCP 탭에서 사용
 */

/**
 * ISO 타임스탬프를 한글 표기로 포맷팅
 * @param iso ISO 문자열 또는 null
 * @returns 포맷된 한글 날짜 문자열
 */
export function formatTimestamp(iso: string | null): string {
  if (!iso) return '아직 없음'
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
