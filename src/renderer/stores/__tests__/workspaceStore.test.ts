import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWorkspaceStore, DOMAIN_PACK_DETAILS } from '../workspaceStore'
import type { DomainPack } from '../../../main/contracts'

const PERSIST_KEY = 'workspace-store'

function getPersistedDomainPack(): string | null {
  const raw = localStorage.getItem(PERSIST_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw).state.domainPack ?? null
  } catch {
    return null
  }
}

describe('workspaceStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    useWorkspaceStore.setState({
      domainPack: 'ops',
    })
  })

  describe('setDomainPack', () => {
    it('domainPack을 변경하고 persist 미들웨어를 통해 저장한다', () => {
      useWorkspaceStore.getState().setDomainPack('functional')

      expect(useWorkspaceStore.getState().domainPack).toBe('functional')
      expect(getPersistedDomainPack()).toBe('functional')
    })

    it('모든 domainPack 값을 설정할 수 있다', () => {
      const packs: DomainPack[] = ['ops', 'functional', 'cbo-maintenance', 'pi-integration', 'btp-rap-cap']
      for (const pack of packs) {
        useWorkspaceStore.getState().setDomainPack(pack)
        expect(useWorkspaceStore.getState().domainPack).toBe(pack)
      }
    })
  })

  describe('applyRecommendedCboWorkspace', () => {
    it('cbo-maintenance를 한꺼번에 적용한다', () => {
      useWorkspaceStore.setState({ domainPack: 'ops' })
      useWorkspaceStore.getState().applyRecommendedCboWorkspace()

      expect(useWorkspaceStore.getState().domainPack).toBe('cbo-maintenance')
      expect(getPersistedDomainPack()).toBe('cbo-maintenance')
    })
  })

  describe('persist 미들웨어 동작', () => {
    it('persist 미들웨어가 workspace-store 키에 상태를 저장한다', () => {
      useWorkspaceStore.getState().setDomainPack('pi-integration')

      const raw = localStorage.getItem(PERSIST_KEY)
      expect(raw).not.toBeNull()
      expect(JSON.parse(raw!).state.domainPack).toBe('pi-integration')
    })
  })

  describe('상수 데이터 검증', () => {
    it('모든 DomainPack에 대한 상세 정보가 정의되어 있다', () => {
      const packs: DomainPack[] = ['ops', 'functional', 'cbo-maintenance', 'pi-integration', 'btp-rap-cap']
      for (const pack of packs) {
        const detail = DOMAIN_PACK_DETAILS[pack]
        expect(detail.label).toBeTruthy()
        expect(detail.chatTitle).toBeTruthy()
        expect(detail.suggestions.length).toBeGreaterThan(0)
      }
    })
  })
})
