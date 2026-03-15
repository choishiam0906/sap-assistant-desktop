import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'

vi.mock('../../logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { PolicyEngine } from '../policyEngine.js'
import type { PolicyRuleInput, PolicyEvaluationContext } from '../policyRules.js'

function createTestDb() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE IF NOT EXISTS policy_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      condition_json TEXT NOT NULL DEFAULT '[]',
      action TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  return db
}

describe('PolicyEngine', () => {
  let db: Database.Database
  let engine: PolicyEngine

  beforeEach(() => {
    db = createTestDb()
    engine = new PolicyEngine(db as never)
  })

  describe('createRule / getRule', () => {
    it('규칙을 생성하고 조회한다', () => {
      const input: PolicyRuleInput = {
        name: 'CBO 자동 승인',
        description: 'CBO 분석은 자동 승인',
        conditions: [{ field: 'skill_id', operator: 'equals', value: 'cbo-impact-analysis' }],
        action: 'auto_approve',
        priority: 10,
      }

      const rule = engine.createRule(input)

      expect(rule.id).toBeTruthy()
      expect(rule.name).toBe('CBO 자동 승인')
      expect(rule.description).toBe('CBO 분석은 자동 승인')
      expect(rule.conditions).toEqual(input.conditions)
      expect(rule.action).toBe('auto_approve')
      expect(rule.priority).toBe(10)
      expect(rule.enabled).toBe(true)

      const fetched = engine.getRule(rule.id)
      expect(fetched).toEqual(rule)
    })

    it('존재하지 않는 ID로 getRule 하면 null을 반환한다', () => {
      expect(engine.getRule('non-existent')).toBeNull()
    })

    it('priority 미지정 시 기본값 0을 사용한다', () => {
      const rule = engine.createRule({
        name: '기본 우선순위 규칙',
        conditions: [{ field: 'action', operator: 'equals', value: 'send' }],
        action: 'require_approval',
      })
      expect(rule.priority).toBe(0)
    })
  })

  describe('listRules', () => {
    it('우선순위 내림차순으로 규칙을 반환한다', () => {
      engine.createRule({
        name: '낮은 우선순위',
        conditions: [{ field: 'action', operator: 'equals', value: 'low' }],
        action: 'auto_approve',
        priority: 1,
      })
      engine.createRule({
        name: '높은 우선순위',
        conditions: [{ field: 'action', operator: 'equals', value: 'high' }],
        action: 'deny',
        priority: 100,
      })

      const rules = engine.listRules()
      expect(rules).toHaveLength(2)
      expect(rules[0].name).toBe('높은 우선순위')
      expect(rules[1].name).toBe('낮은 우선순위')
    })
  })

  describe('updateRule', () => {
    it('규칙 필드를 업데이트한다', () => {
      const rule = engine.createRule({
        name: '원본',
        conditions: [{ field: 'action', operator: 'equals', value: 'test' }],
        action: 'auto_approve',
        priority: 5,
      })

      const updated = engine.updateRule(rule.id, {
        name: '수정됨',
        action: 'deny',
        priority: 20,
      })

      expect(updated?.name).toBe('수정됨')
      expect(updated?.action).toBe('deny')
      expect(updated?.priority).toBe(20)
    })

    it('enabled 상태를 토글한다', () => {
      const rule = engine.createRule({
        name: '토글 테스트',
        conditions: [],
        action: 'auto_approve',
      })
      expect(rule.enabled).toBe(true)

      const disabled = engine.updateRule(rule.id, { enabled: false })
      expect(disabled?.enabled).toBe(false)

      const enabled = engine.updateRule(rule.id, { enabled: true })
      expect(enabled?.enabled).toBe(true)
    })

    it('존재하지 않는 ID를 업데이트하면 null을 반환한다', () => {
      expect(engine.updateRule('no-such-id', { name: 'x' })).toBeNull()
    })
  })

  describe('deleteRule', () => {
    it('규칙을 삭제하고 true를 반환한다', () => {
      const rule = engine.createRule({
        name: '삭제할 규칙',
        conditions: [],
        action: 'auto_approve',
      })

      expect(engine.deleteRule(rule.id)).toBe(true)
      expect(engine.getRule(rule.id)).toBeNull()
    })

    it('존재하지 않는 ID를 삭제하면 false를 반환한다', () => {
      expect(engine.deleteRule('nope')).toBe(false)
    })
  })

  describe('evaluate', () => {
    it('매칭 규칙이 없으면 require_approval을 반환한다', () => {
      const result = engine.evaluate({ action: 'send' })
      expect(result.action).toBe('require_approval')
      expect(result.matchedRule).toBeNull()
    })

    it('equals 조건으로 매칭한다', () => {
      engine.createRule({
        name: 'CBO 자동 승인',
        conditions: [{ field: 'skill_id', operator: 'equals', value: 'cbo-impact-analysis' }],
        action: 'auto_approve',
        priority: 10,
      })

      const match = engine.evaluate({ action: 'analyze', skillId: 'cbo-impact-analysis' })
      expect(match.action).toBe('auto_approve')
      expect(match.matchedRule?.name).toBe('CBO 자동 승인')

      const noMatch = engine.evaluate({ action: 'analyze', skillId: 'other-skill' })
      expect(noMatch.action).toBe('require_approval')
    })

    it('not_equals 조건으로 매칭한다', () => {
      engine.createRule({
        name: 'non-ops 차단',
        conditions: [{ field: 'domain_pack', operator: 'not_equals', value: 'ops' }],
        action: 'deny',
        priority: 5,
      })

      const deny = engine.evaluate({ action: 'send', domainPack: 'functional' })
      expect(deny.action).toBe('deny')

      const pass = engine.evaluate({ action: 'send', domainPack: 'ops' })
      expect(pass.action).toBe('require_approval')
    })

    it('in 조건으로 매칭한다', () => {
      engine.createRule({
        name: '특정 provider만 허용',
        conditions: [{ field: 'provider', operator: 'in', value: ['openai', 'anthropic'] }],
        action: 'auto_approve',
        priority: 10,
      })

      expect(engine.evaluate({ action: 'send', provider: 'openai' }).action).toBe('auto_approve')
      expect(engine.evaluate({ action: 'send', provider: 'azure' }).action).toBe('require_approval')
    })

    it('not_in 조건으로 매칭한다', () => {
      engine.createRule({
        name: '차단 provider',
        conditions: [{ field: 'provider', operator: 'not_in', value: ['blocked-provider'] }],
        action: 'auto_approve',
        priority: 10,
      })

      expect(engine.evaluate({ action: 'send', provider: 'openai' }).action).toBe('auto_approve')
      expect(engine.evaluate({ action: 'send', provider: 'blocked-provider' }).action).toBe('require_approval')
    })

    it('우선순위가 높은 규칙이 먼저 매칭된다', () => {
      engine.createRule({
        name: '낮은 우선순위 승인',
        conditions: [{ field: 'action', operator: 'equals', value: 'send' }],
        action: 'auto_approve',
        priority: 1,
      })
      engine.createRule({
        name: '높은 우선순위 거부',
        conditions: [{ field: 'action', operator: 'equals', value: 'send' }],
        action: 'deny',
        priority: 100,
      })

      const result = engine.evaluate({ action: 'send' })
      expect(result.action).toBe('deny')
      expect(result.matchedRule?.name).toBe('높은 우선순위 거부')
    })

    it('비활성 규칙은 무시한다', () => {
      const rule = engine.createRule({
        name: '비활성 규칙',
        conditions: [{ field: 'action', operator: 'equals', value: 'send' }],
        action: 'deny',
        priority: 100,
      })
      engine.updateRule(rule.id, { enabled: false })

      const result = engine.evaluate({ action: 'send' })
      expect(result.action).toBe('require_approval')
    })

    it('모든 조건이 충족되어야 매칭한다 (AND 로직)', () => {
      engine.createRule({
        name: '복합 조건',
        conditions: [
          { field: 'action', operator: 'equals', value: 'send' },
          { field: 'provider', operator: 'equals', value: 'openai' },
        ],
        action: 'auto_approve',
        priority: 10,
      })

      expect(engine.evaluate({ action: 'send', provider: 'openai' }).action).toBe('auto_approve')
      expect(engine.evaluate({ action: 'send', provider: 'azure' }).action).toBe('require_approval')
      expect(engine.evaluate({ action: 'other', provider: 'openai' }).action).toBe('require_approval')
    })

    it('external_transfer boolean 조건을 평가한다', () => {
      engine.createRule({
        name: '외부 전송 차단',
        conditions: [{ field: 'external_transfer', operator: 'equals', value: true }],
        action: 'require_approval',
        priority: 5,
      })

      const ctx: PolicyEvaluationContext = { action: 'send', externalTransfer: true }
      expect(engine.evaluate(ctx).action).toBe('require_approval')
      expect(engine.evaluate(ctx).matchedRule?.name).toBe('외부 전송 차단')
    })
  })
})
