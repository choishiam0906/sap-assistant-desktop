import { useEffect } from 'react'
import { useAppShellStore } from '../stores/appShellStore'
import { useDashboardStore } from '../stores/dashboardStore'
import type { DashboardViewMode } from '../stores/dashboardStore'
import { FirstRunBanner } from '../components/onboarding/FirstRunBanner'
import { DashboardOverviewPanel } from './dashboard/DashboardOverviewPanel'
import { TaskTimelinePanel } from './dashboard/TaskTimelinePanel'
import { SearchDetailPanel } from './dashboard/SearchDetailPanel'
import { ReportsDetailPanel } from './dashboard/ReportsDetailPanel'
import { CockpitSubNav } from './cockpit/CockpitSubNav'
import { PlanListPanel } from './cockpit/PlanListPanel'
import { PlanDetailPanel } from './cockpit/PlanDetailPanel'
import { SchedulePanel } from './cockpit/SchedulePanel'
import './CockpitPage.css'

const VALID_VIEW_MODES: DashboardViewMode[] = [
  'overview', 'tasks', 'all-plans', 'schedule', 'search', 'reports',
]

export function DashboardPage() {
  const subPage = useAppShellStore((s) => s.subPage)
  const viewMode = useDashboardStore((s) => s.viewMode)
  const setViewMode = useDashboardStore((s) => s.setViewMode)

  // Sidebar subPage → dashboardStore.viewMode 동기화
  useEffect(() => {
    const mapped = VALID_VIEW_MODES.includes(subPage as DashboardViewMode)
      ? (subPage as DashboardViewMode)
      : 'overview'
    if (viewMode !== mapped) {
      setViewMode(mapped)
    }
  }, [subPage, viewMode, setViewMode])

  return (
    <div className="cockpit-page">
      <FirstRunBanner />
      {viewMode === 'overview' && <DashboardOverviewPanel />}
      {viewMode === 'tasks' && <TaskTimelinePanel />}
      {viewMode === 'schedule' && <SchedulePanel />}
      {viewMode === 'all-plans' && (
        <>
          <CockpitSubNav />
          <PlanListPanel />
          <PlanDetailPanel />
        </>
      )}
      {viewMode === 'search' && <SearchDetailPanel />}
      {viewMode === 'reports' && <ReportsDetailPanel />}
    </div>
  )
}
