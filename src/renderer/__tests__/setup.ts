import '@testing-library/jest-dom/vitest'
import { createMockApi } from './mocks/factories'

const mockApi = createMockApi()

// node 환경(main process 테스트)에서는 window가 없으므로 건너뜀
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'assistantDesktop', {
    value: mockApi,
    writable: true,
  })
}

// 각 테스트 전에 모든 mock 초기화
beforeEach(() => {
  Object.values(mockApi).forEach((fn) => fn.mockClear())
})

export { mockApi }
