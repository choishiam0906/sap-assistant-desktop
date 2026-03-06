import { create } from 'zustand'
import type { AuditAction, SecurityMode } from '../../main/contracts'

type AuditTab = 'sessions' | 'audit'

interface AuditState {
  tab: AuditTab
  setTab: (tab: AuditTab) => void
  filterSecurityMode: SecurityMode | ''
  filterAction: AuditAction | ''
  filterDateFrom: string
  filterDateTo: string
  setFilterSecurityMode: (mode: SecurityMode | '') => void
  setFilterAction: (action: AuditAction | '') => void
  setFilterDateFrom: (date: string) => void
  setFilterDateTo: (date: string) => void
  resetFilters: () => void
}

export const useAuditStore = create<AuditState>((set) => ({
  tab: 'sessions',
  setTab: (tab) => set({ tab }),
  filterSecurityMode: '',
  filterAction: '',
  filterDateFrom: '',
  filterDateTo: '',
  setFilterSecurityMode: (filterSecurityMode) => set({ filterSecurityMode }),
  setFilterAction: (filterAction) => set({ filterAction }),
  setFilterDateFrom: (filterDateFrom) => set({ filterDateFrom }),
  setFilterDateTo: (filterDateTo) => set({ filterDateTo }),
  resetFilters: () =>
    set({
      filterSecurityMode: '',
      filterAction: '',
      filterDateFrom: '',
      filterDateTo: '',
    }),
}))
