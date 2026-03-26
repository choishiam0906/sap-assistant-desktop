import { create } from 'zustand'

export type PlanFilter = 'all' | 'in-progress' | 'completed' | 'delayed'
export type DashboardViewMode =
  | 'overview'     // 메인 대시보드 (위젯 그리드)
  | 'tasks'        // 통합 태스크 타임라인 (daily+monthly+yearly)
  | 'all-plans'    // 전체 Plan 목록
  | 'schedule'     // 스케줄
  | 'search'       // AI 검색 전체 보기
  | 'reports'      // 리포트 전체 보기

/** @deprecated Use DashboardViewMode */
export type CockpitViewMode = DashboardViewMode

interface DashboardState {
  selectedPlanId: string | null
  filter: PlanFilter
  searchQuery: string
  viewMode: DashboardViewMode
  setSelectedPlanId: (id: string | null) => void
  setFilter: (filter: PlanFilter) => void
  setSearchQuery: (query: string) => void
  setViewMode: (mode: DashboardViewMode) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedPlanId: null,
  filter: 'all',
  searchQuery: '',
  viewMode: 'overview',
  setSelectedPlanId: (selectedPlanId) => set({ selectedPlanId }),
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setViewMode: (viewMode) => set({ viewMode }),
}))

/** @deprecated Use useDashboardStore */
export const useCockpitStore = useDashboardStore
