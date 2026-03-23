import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const tempDir = mkdtempSync(join(tmpdir(), 'secure-store-test-'))

// electron app mock
vi.mock('electron', () => ({
  app: {
    getPath: () => tempDir,
    getName: () => 'sap-knowledge-hub-test',
  },
}))

// keytar를 항상 실패하도록 mock → fileFallback 사용
vi.mock('keytar', () => {
  throw new Error('keytar not available in test')
})

import { SecureStore } from '../secureStore.js'

describe('SecureStore (fallback 모드)', () => {
  let store: SecureStore

  beforeEach(() => {
    store = new SecureStore('test-service')
  })

  it('저장하지 않은 provider에 대해 null을 반환한다', async () => {
    const result = await store.get('openai')
    expect(result).toBeNull()
  })

  it('set → get으로 SecureRecord를 저장하고 조회한다', async () => {
    const record = { accessToken: 'tok-123', refreshToken: 'ref-456' }
    await store.set('openai', record)

    const result = await store.get('openai')
    expect(result).toEqual(record)
  })

  it('expiresAt 필드도 저장/조회한다', async () => {
    const record = {
      accessToken: 'tok-789',
      refreshToken: 'ref-abc',
      expiresAt: '2026-12-31T23:59:59Z',
    }
    await store.set('azure', record)

    const result = await store.get('azure')
    expect(result).toEqual(record)
  })

  it('delete 후 null을 반환한다', async () => {
    await store.set('anthropic', { accessToken: 'tok-delete-test' })
    await store.delete('anthropic')

    const result = await store.get('anthropic')
    expect(result).toBeNull()
  })

  it('다른 provider의 값은 독립적으로 관리된다', async () => {
    await store.set('openai', { accessToken: 'openai-tok' })
    await store.set('anthropic', { accessToken: 'anthropic-tok' })

    const openai = await store.get('openai')
    const anthropic = await store.get('anthropic')
    expect(openai?.accessToken).toBe('openai-tok')
    expect(anthropic?.accessToken).toBe('anthropic-tok')
  })

  it('같은 provider에 대해 set을 다시 호출하면 덮어쓴다', async () => {
    await store.set('openai', { accessToken: 'old-tok' })
    await store.set('openai', { accessToken: 'new-tok' })

    const result = await store.get('openai')
    expect(result?.accessToken).toBe('new-tok')
  })
})
