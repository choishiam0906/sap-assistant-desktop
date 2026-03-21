import { create } from 'zustand'

export type SessionFilterTab = 'all' | 'flagged' | 'saved'

interface AssistantState {
  filterTab: SessionFilterTab
  searchQuery: string
  setFilterTab: (tab: SessionFilterTab) => void
  setSearchQuery: (query: string) => void
}

export const useAssistantStore = create<AssistantState>((set) => ({
  filterTab: 'all',
  searchQuery: '',
  setFilterTab: (filterTab) => set({ filterTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}))
