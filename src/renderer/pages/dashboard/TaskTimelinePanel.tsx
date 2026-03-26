import { useState, useMemo } from 'react'
import { Calendar, CheckCircle2 } from 'lucide-react'
import { usePlans } from '../../hooks/useClosingPlans'
import { calculateDday } from '../../../main/types/closing'
import type { ClosingPlan, PlanType } from '../../../main/types/closing'
import { PageHeader } from '../../components/ui/PageHeader'

type FrequencyFilter = 'all' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

const FILTER_TABS: { value: FrequencyFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'monthly', label: '월별' },
  { value: 'quarterly', label: '분기별' },
  { value: 'yearly', label: '연별' },
]

interface TimelineGroup {
  label: string
  plans: Array<ClosingPlan & { dday: ReturnType<typeof calculateDday> }>
}

function groupByTimeline(plans: ClosingPlan[]): TimelineGroup[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()))
  const nextWeekEnd = new Date(weekEnd)
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7)

  const groups: Record<string, TimelineGroup> = {
    overdue: { label: '지연', plans: [] },
    today: { label: `오늘 (${today.getMonth() + 1}/${today.getDate()})`, plans: [] },
    thisWeek: { label: '이번 주', plans: [] },
    nextWeek: { label: '다음 주', plans: [] },
    later: { label: '이후', plans: [] },
    completed: { label: '완료', plans: [] },
  }

  for (const plan of plans) {
    const dday = calculateDday(plan.targetDate)
    const entry = { ...plan, dday }

    if (plan.status === 'completed') {
      groups.completed.plans.push(entry)
    } else if (dday.isOverdue) {
      groups.overdue.plans.push(entry)
    } else if (dday.daysRemaining === 0) {
      groups.today.plans.push(entry)
    } else {
      const target = new Date(plan.targetDate + 'T00:00:00')
      if (target <= weekEnd) {
        groups.thisWeek.plans.push(entry)
      } else if (target <= nextWeekEnd) {
        groups.nextWeek.plans.push(entry)
      } else {
        groups.later.plans.push(entry)
      }
    }
  }

  return Object.values(groups).filter((g) => g.plans.length > 0)
}

const TYPE_LABEL: Record<PlanType, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
}

export function TaskTimelinePanel() {
  const [filter, setFilter] = useState<FrequencyFilter>('all')
  const { data: plans } = usePlans()

  const filtered = useMemo(() => {
    if (!plans) return []
    if (filter === 'all') return plans
    return plans.filter((p) => p.type === filter)
  }, [plans, filter])

  const groups = useMemo(() => groupByTimeline(filtered), [filtered])

  return (
    <div className="cockpit-overview-panel">
      <PageHeader
        title="마감 일정"
        description="일별·월별·연별 마감 일정을 타임라인으로 확인하세요"
      />

      <div className="timeline-filter-tabs">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            className={`timeline-filter-tab ${filter === tab.value ? 'active' : ''}`}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="closing-empty">
          <p>해당 조건의 마감 일정이 없어요.</p>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label} className="timeline-group">
          <div className="timeline-group-label">{group.label}</div>
          {group.plans.map((plan) => (
            <div key={plan.id} className="timeline-item">
              <span className="timeline-item-icon">
                {plan.status === 'completed'
                  ? <CheckCircle2 size={16} className="closing-status-icon completed" />
                  : <Calendar size={16} className="closing-status-icon in-progress" />}
              </span>
              <span className="closing-plan-type-badge">{TYPE_LABEL[plan.type]}</span>
              <span className="timeline-item-title">{plan.title}</span>
              <span className={`closing-dday-badge ${plan.dday.category}`}>
                {plan.dday.isOverdue
                  ? `D+${Math.abs(plan.dday.daysRemaining)}`
                  : plan.dday.daysRemaining === 0
                    ? 'D-Day'
                    : `D-${plan.dday.daysRemaining}`}
              </span>
              <span className="cockpit-alert-progress">{plan.progressPercent}%</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
