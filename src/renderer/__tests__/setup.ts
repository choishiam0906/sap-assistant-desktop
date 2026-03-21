import '@testing-library/jest-dom/vitest'
import { createMockApi } from './mocks/factories'

const mockApi = createMockApi()

Object.defineProperty(window, 'assistantDesktop', {
  value: mockApi,
  writable: true,
})
// 하위 호환 alias
Object.defineProperty(window, 'sapOpsDesktop', {
  value: mockApi,
  writable: true,
})

// 각 테스트 전에 모든 mock 초기화
beforeEach(() => {
  Object.values(mockApi).forEach((fn) => fn.mockClear())
})

export { mockApi }
