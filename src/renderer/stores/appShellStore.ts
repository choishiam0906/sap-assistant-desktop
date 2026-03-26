import { create } from 'zustand'

// ─── 새 계층형 네비게이션 타입 ───

export type AppSection = 'dashboard' | 'assistant' | 'knowledge' | 'email' | 'settings'

/** @deprecated v8.0 호환 — 레거시 섹션 리다이렉트용 */
export type LegacySection = 'cockpit' | 'code-analysis' | 'search' | 'reports'

export type DashboardSubPage = 'overview' | 'tasks' | 'all-plans' | 'schedule' | 'search' | 'reports'
/** @deprecated Use DashboardSubPage */
export type CockpitSubPage = DashboardSubPage
export type CodeLabSubPage =
  | 'code-lab'
  | 'code-lab:sources'
  | 'code-lab:analysis'
  | 'code-lab:archive'
export type AssistantSubPage =
  | 'chat'           // 대화 모드 (기본)
  | 'chat:flagged'   // 중요 세션 필터
  | 'chat:saved'     // 보관함 필터
  | 'analysis'       // 분석 모드 (레거시, code-lab:analysis로 리다이렉트)
  | 'archive'        // 소스코드 아카이브 (레거시, code-lab:archive로 리다이렉트)
  | CodeLabSubPage
/** @deprecated Use AssistantSubPage */
export type SapAssistantSubPage = AssistantSubPage
export type KnowledgeSubPage = 'process' | 'skills' | 'agents' | CodeLabSubPage
export type EmailSubPage = 'inbox' | 'analyzed' | 'settings'

/** @deprecated Phase 1 호환 레이어 — AskSapSubPage는 SessionFilterTab으로 이전됨 */
export type AskSapSubPage = 'all' | 'flagged' | 'saved'
/** @deprecated Phase 1 호환 레이어 — CboSubPage는 제거 예정 */
export type CboSubPage = 'new' | 'history' | 'batch' | 'diff'

/** @deprecated Phase 1 호환 레이어 — 점진적 제거 예정 */
export type AppPage = 'chat' | 'cbo' | 'audit' | 'sources' | 'process' | 'skills' | 'vault' | 'settings'

interface AppShellState {
  currentSection: AppSection
  subPage: string | null
  sidebarCollapsed: boolean
  setSection: (section: AppSection | LegacySection, subPage?: string | null) => void
  setSubPage: (subPage: string | null) => void
  toggleSidebar: () => void
  /** @deprecated Phase 1 호환 레이어 */
  currentPage: AppPage
  /** @deprecated Phase 1 호환 레이어 */
  setCurrentPage: (page: AppPage) => void
}

// 레거시 섹션 → 새 위치로 리다이렉트
function resolveLegacySection(section: string, subPage: string | null | undefined): { section: AppSection; subPage: string | null } {
  switch (section) {
    case 'cockpit': return { section: 'dashboard', subPage: subPage ?? 'overview' }
    case 'search': return { section: 'dashboard', subPage: 'search' }
    case 'reports': return { section: 'dashboard', subPage: 'reports' }
    case 'code-analysis': return { section: 'knowledge', subPage: 'code-lab' }
    case 'vault': return { section: 'knowledge', subPage: 'process' }
    default: return { section: section as AppSection, subPage: subPage ?? null }
  }
}

// AppPage → AppSection 매핑
function pageToSection(page: AppPage): { section: AppSection; subPage: string | null } {
  switch (page) {
    case 'audit': return { section: 'dashboard', subPage: 'overview' }
    case 'chat': return { section: 'assistant', subPage: 'chat' }
    case 'process': return { section: 'knowledge', subPage: 'process' }
    case 'skills': return { section: 'knowledge', subPage: 'skills' }
    case 'cbo': return { section: 'knowledge', subPage: 'code-lab:analysis' }
    case 'sources': return { section: 'knowledge', subPage: 'code-lab:sources' }
    case 'vault': return { section: 'knowledge', subPage: 'process' }
    case 'settings': return { section: 'settings', subPage: null }
  }
}

// AppSection → AppPage 역매핑 (호환용)
function sectionToPage(section: AppSection, subPage: string | null): AppPage {
  switch (section) {
    case 'dashboard': return 'audit'
    case 'assistant': return 'chat'
    case 'knowledge':
      if (subPage === 'process') return 'process'
      if (subPage === 'skills') return 'skills'
      if (subPage === 'vault') return 'process'
      if (subPage === 'code-lab:analysis') return 'cbo'
      return 'sources'
    case 'email': return 'chat'
    case 'settings': return 'settings'
  }
}

export const useAppShellStore = create<AppShellState>((set) => ({
  currentSection: 'dashboard',
  subPage: null,
  sidebarCollapsed: false,

  setSection: (section, subPage) =>
    set(() => {
      // 레거시 섹션 → 새 위치로 리다이렉트
      const resolved = resolveLegacySection(section, subPage)
      return {
        currentSection: resolved.section,
        subPage: resolved.subPage,
        currentPage: sectionToPage(resolved.section, resolved.subPage),
      }
    }),

  setSubPage: (subPage) => set({ subPage }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // 호환 레이어: 기존 setCurrentPage 호출이 새 상태도 동기화
  currentPage: 'audit',
  setCurrentPage: (page) => {
    const { section, subPage } = pageToSection(page)
    set({ currentPage: page, currentSection: section, subPage })
  },
}))
