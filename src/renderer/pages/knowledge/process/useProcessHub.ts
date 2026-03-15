import { useEffect, useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../hooks/queryKeys.js'
import type {
  AgentDefinition,
  RoutineFrequency,
  SourceDocument,
  RoutineTemplate,
  RoutineTemplateStep,
  VaultEntry,
} from '../../../../main/contracts.js'
import {
  useCreateRoutineTemplate,
  useDeleteRoutineTemplate,
  usePinRoutineKnowledgeLink,
  useRoutineKnowledgeLinks,
  useRoutineExecutions,
  useRoutineTemplates,
  useToggleRoutineTemplate,
  useUnpinRoutineKnowledgeLink,
} from '../../../hooks/useRoutineTemplates.js'
import { useWorkspaceStore } from '../../../stores/workspaceStore.js'

const api = window.sapOpsDesktop

type ProcessFrequencyFilter = 'all' | 'active' | RoutineFrequency

interface ProcessDetail {
  template: RoutineTemplate
  steps: RoutineTemplateStep[]
}

interface RelatedKnowledgeBundle {
  confidentialVault: VaultEntry[]
  referenceVault: VaultEntry[]
  sourceDocuments: SourceDocument[]
}

// 유틸리티 함수들
export function frequencyLabel(frequency: RoutineFrequency): string {
  switch (frequency) {
    case 'daily':
      return 'Daily'
    case 'monthly':
      return 'Monthly'
    case 'yearly':
      return 'Yearly'
  }
}

export function frequencyDescription(frequency: RoutineFrequency): string {
  switch (frequency) {
    case 'daily':
      return '매일 반복되는 운영 절차예요.'
    case 'monthly':
      return '월마감이나 정산처럼 정기적인 절차에 맞아요.'
    case 'yearly':
      return '연말 결산이나 대규모 점검 프로세스에 적합해요.'
  }
}

export function categoryLabel(category: AgentDefinition['category']): string {
  switch (category) {
    case 'analysis':
      return '분석'
    case 'documentation':
      return '문서화'
    case 'validation':
      return '검증'
    case 'automation':
      return '자동화'
  }
}

export function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}초`
  return `${Math.round(seconds / 60)}분`
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso
  }
}

export function formatTrigger(template: RoutineTemplate): string {
  if (template.frequency === 'daily') return '매일 기준으로 실행돼요'
  if (template.frequency === 'monthly') {
    return template.triggerDay ? `매월 ${template.triggerDay}일 기준` : '매월 일정 기준'
  }

  const monthText = template.triggerMonth ? `${template.triggerMonth}월` : '연간'
  const dayText = template.triggerDay ? ` ${template.triggerDay}일` : ''
  return `${monthText}${dayText} 기준`
}

export function summarizeModules(steps: RoutineTemplateStep[]): string {
  const modules = Array.from(new Set(steps.map((step) => step.module).filter(Boolean)))
  if (modules.length === 0) return '모듈 정보 없음'
  return modules.join(' · ')
}

function normalizeText(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ').toLowerCase()
}

export function buildLinkKey(targetType: string, targetId: string): string {
  return `${targetType}:${targetId}`
}

function buildKnowledgeCandidates(template: RoutineTemplate, steps: RoutineTemplateStep[]): string[] {
  return Array.from(new Set([
    template.name,
    ...steps.map((step) => step.title),
    ...steps.map((step) => step.module),
  ].map((value) => value?.trim()).filter((value): value is string => Boolean(value && value.length >= 2))))
    .slice(0, 3)
}

function scoreKnowledgeMatch(haystack: string, candidates: string[], modules: string[]): number {
  let score = 1

  candidates.forEach((candidate, index) => {
    if (haystack.includes(candidate.toLowerCase())) {
      score += Math.max(2, 5 - index)
    }
  })

  modules.forEach((module) => {
    if (haystack.includes(module.toLowerCase())) {
      score += 2
    }
  })

  return score
}

function rankUniqueItems<T extends { id: string }>(items: T[], scorer: (item: T) => number, limit: number): T[] {
  const deduped = new Map<string, T>()
  items.forEach((item) => {
    if (!deduped.has(item.id)) {
      deduped.set(item.id, item)
    }
  })

  return [...deduped.values()]
    .sort((left, right) => scorer(right) - scorer(left))
    .slice(0, limit)
}

export function useProcessHub(
  selectedProcessId: string | null,
  setSelectedProcessId: (id: string | null) => void,
  searchQuery: string,
  setSearchQuery: (query: string) => void,
  frequencyFilter: ProcessFrequencyFilter,
  setFrequencyFilter: (filter: ProcessFrequencyFilter) => void
) {
  const domainPack = useWorkspaceStore((state) => state.domainPack)

  const { data: templates = [], isLoading: isTemplatesLoading } = useRoutineTemplates()
  const { data: executions = [] } = useRoutineExecutions()
  const createMutation = useCreateRoutineTemplate()
  const deleteMutation = useDeleteRoutineTemplate()
  const toggleMutation = useToggleRoutineTemplate()
  const pinKnowledgeMutation = usePinRoutineKnowledgeLink()
  const unpinKnowledgeMutation = useUnpinRoutineKnowledgeLink()

  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.list(domainPack),
    queryFn: () => api.listAgents(domainPack),
    staleTime: 60_000,
  })

  const processDetailQueries = useQueries({
    queries: templates.map((template) => ({
      queryKey: queryKeys.routines.template(template.id),
      queryFn: async (): Promise<ProcessDetail | null> => api.getRoutineTemplate(template.id),
      staleTime: 60_000,
    })),
  })

  const processDetails = useMemo(() => {
    const detailMap = new Map<string, ProcessDetail>()
    processDetailQueries.forEach((query, index) => {
      if (query.data) {
        detailMap.set(templates[index].id, query.data)
      }
    })
    return detailMap
  }, [processDetailQueries, templates])

  const filteredTemplates = useMemo(() => {
    const search = searchQuery.trim().toLowerCase()
    return templates.filter((template) => {
      if (frequencyFilter === 'active' && !template.isActive) return false
      if (frequencyFilter !== 'all' && frequencyFilter !== 'active' && template.frequency !== frequencyFilter) return false
      if (!search) return true

      const detail = processDetails.get(template.id)
      const haystack = normalizeText([
        template.name,
        template.description,
        ...(detail?.steps.map((step) => `${step.title} ${step.description ?? ''} ${step.module ?? ''}`) ?? []),
      ])
      return haystack.includes(search)
    })
  }, [frequencyFilter, processDetails, searchQuery, templates])

  useEffect(() => {
    if (filteredTemplates.length === 0) {
      if (selectedProcessId) setSelectedProcessId(null)
      return
    }

    const selectedVisible = filteredTemplates.some((template) => template.id === selectedProcessId)
    if (!selectedVisible) {
      setSelectedProcessId(filteredTemplates[0].id)
    }
  }, [filteredTemplates, selectedProcessId, setSelectedProcessId])

  const selectedTemplate = filteredTemplates.find((template) => template.id === selectedProcessId)
    ?? templates.find((template) => template.id === selectedProcessId)
    ?? null
  const selectedSteps = useMemo(
    () => (selectedTemplate ? processDetails.get(selectedTemplate.id)?.steps ?? [] : []),
    [selectedTemplate, processDetails]
  )

  const selectedExecutions = useMemo(() => {
    if (!selectedTemplate) return []
    return [...executions]
      .filter((execution) => execution.templateId === selectedTemplate.id)
      .sort((a, b) => {
        if (a.executionDate !== b.executionDate) return b.executionDate.localeCompare(a.executionDate)
        return b.createdAt.localeCompare(a.createdAt)
      })
      .slice(0, 5)
  }, [executions, selectedTemplate])

  const { data: pinnedKnowledge = [] } = useRoutineKnowledgeLinks(selectedTemplate?.id ?? null)

  const activeTemplatesCount = templates.filter((template) => template.isActive).length
  const moduleCoverageCount = useMemo(() => {
    const modules = new Set<string>()
    processDetails.forEach((detail) => {
      detail.steps.forEach((step) => {
        if (step.module) modules.add(step.module)
      })
    })
    return modules.size
  }, [processDetails])

  const recommendedAgents = useMemo(() => {
    if (!selectedTemplate) return agents.slice(0, 3)

    const processText = normalizeText([
      selectedTemplate.name,
      selectedTemplate.description,
      ...selectedSteps.map((step) => `${step.title} ${step.description ?? ''} ${step.module ?? ''}`),
    ])
    const processModules = new Set(selectedSteps.map((step) => step.module?.toLowerCase()).filter(Boolean))

    return [...agents]
      .map((agent) => {
        let score = 1
        const agentText = normalizeText([
          agent.title,
          agent.description,
          ...agent.steps.map((step) => `${step.label} ${step.description ?? ''}`),
        ])

        processModules.forEach((module) => {
          if (module && agentText.includes(module)) score += 2
        })

        processText
          .split(/\s+/)
          .map((token) => token.trim())
          .filter((token) => token.length >= 3)
          .slice(0, 12)
          .forEach((token) => {
            if (agentText.includes(token)) score += 1
          })

        return { agent, score }
      })
      .sort((left, right) => right.score - left.score || left.agent.title.localeCompare(right.agent.title))
      .slice(0, 3)
      .map((entry) => entry.agent)
  }, [agents, selectedSteps, selectedTemplate])

  const pinnedKnowledgeMap = useMemo(() => {
    const entries = pinnedKnowledge.map((link) => [buildLinkKey(link.targetType, link.targetId), link] as const)
    return new Map(entries)
  }, [pinnedKnowledge])

  const knowledgeCandidates = useMemo(
    () => (selectedTemplate ? buildKnowledgeCandidates(selectedTemplate, selectedSteps) : []),
    [selectedSteps, selectedTemplate]
  )
  const selectedModules = useMemo(
    () => Array.from(new Set(selectedSteps.map((step) => step.module).filter(Boolean))) as string[],
    [selectedSteps]
  )

  const {
    data: relatedKnowledge,
    isLoading: isLoadingRelatedKnowledge,
  } = useQuery({
    queryKey: queryKeys.process.knowledge(selectedTemplate?.id, domainPack, knowledgeCandidates.join('|')),
    queryFn: async (): Promise<RelatedKnowledgeBundle> => {
      const [confidentialGroups, referenceGroups, sourceGroups] = await Promise.all([
        Promise.all(knowledgeCandidates.map((query) => api.searchVaultByClassification('confidential', query, 6))),
        Promise.all(knowledgeCandidates.map((query) => api.searchVaultByClassification('reference', query, 6))),
        Promise.all(knowledgeCandidates.map((query) => api.searchSourceDocuments({
          query,
          sourceKind: 'local-folder',
          domainPack,
          limit: 6,
        }))),
      ])

      const confidentialVault = rankUniqueItems(
        confidentialGroups.flat(),
        (entry) => scoreKnowledgeMatch(
          normalizeText([entry.title, entry.excerpt ?? '', entry.filePath ?? '']),
          knowledgeCandidates,
          selectedModules
        ),
        3
      )

      const referenceVault = rankUniqueItems(
        referenceGroups.flat(),
        (entry) => scoreKnowledgeMatch(
          normalizeText([entry.title, entry.excerpt ?? '', entry.filePath ?? '']),
          knowledgeCandidates,
          selectedModules
        ),
        3
      )

      const sourceDocuments = rankUniqueItems(
        sourceGroups.flat(),
        (document) => scoreKnowledgeMatch(
          normalizeText([document.title, document.relativePath, document.excerpt ?? '', document.tags.join(' ')]),
          knowledgeCandidates,
          selectedModules
        ),
        4
      )

      return {
        confidentialVault,
        referenceVault,
        sourceDocuments,
      }
    },
    enabled: !!selectedTemplate && knowledgeCandidates.length > 0,
    staleTime: 30_000,
  })

  return {
    selectedProcessId,
    setSelectedProcessId,
    searchQuery,
    setSearchQuery,
    frequencyFilter,
    setFrequencyFilter,
    templates,
    filteredTemplates,
    selectedTemplate,
    selectedSteps,
    selectedExecutions,
    processDetails,
    agents,
    recommendedAgents,
    pinnedKnowledge,
    pinnedKnowledgeMap,
    relatedKnowledge,
    isLoadingRelatedKnowledge,
    isTemplatesLoading,
    knowledgeCandidates,
    selectedModules,
    activeTemplatesCount,
    moduleCoverageCount,
    createMutation,
    deleteMutation,
    toggleMutation,
    pinKnowledgeMutation,
    unpinKnowledgeMutation,
  }
}
