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

import { MigrationRunner } from '../migrationRunner.js'
import type { Migration } from '../migrationRunner.js'

describe('MigrationRunner', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('schema_version 테이블을 자동 생성한다', () => {
    new MigrationRunner(db)

    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
      .get() as { name: string } | undefined
    expect(table?.name).toBe('schema_version')
  })

  it('마이그레이션이 없으면 applied: 0을 반환한다', () => {
    const runner = new MigrationRunner(db)
    const result = runner.run([])
    expect(result).toEqual({ applied: 0, currentVersion: 0 })
  })

  it('마이그레이션을 버전 순서대로 실행한다', () => {
    const runner = new MigrationRunner(db)
    const order: number[] = []

    const migrations: Migration[] = [
      {
        version: 2,
        name: 'second',
        up: () => { order.push(2) },
      },
      {
        version: 1,
        name: 'first',
        up: () => { order.push(1) },
      },
      {
        version: 3,
        name: 'third',
        up: () => { order.push(3) },
      },
    ]

    const result = runner.run(migrations)
    expect(result.applied).toBe(3)
    expect(result.currentVersion).toBe(3)
    expect(order).toEqual([1, 2, 3])
  })

  it('이미 적용된 마이그레이션은 건너뛴다', () => {
    const runner = new MigrationRunner(db)
    const callCount = { v1: 0, v2: 0 }

    const migrations: Migration[] = [
      { version: 1, name: 'first', up: () => { callCount.v1++ } },
      { version: 2, name: 'second', up: () => { callCount.v2++ } },
    ]

    runner.run(migrations)
    expect(callCount).toEqual({ v1: 1, v2: 1 })

    // 다시 실행해도 건너뜀
    const result = runner.run(migrations)
    expect(result.applied).toBe(0)
    expect(callCount).toEqual({ v1: 1, v2: 1 })
  })

  it('getCurrentVersion으로 현재 버전을 조회한다', () => {
    const runner = new MigrationRunner(db)
    expect(runner.getCurrentVersion()).toBe(0)

    runner.run([
      { version: 1, name: 'v1', up: () => {} },
      { version: 5, name: 'v5', up: () => {} },
    ])

    expect(runner.getCurrentVersion()).toBe(5)
  })

  it('중간 추가된 마이그레이션만 실행한다', () => {
    const runner = new MigrationRunner(db)
    runner.run([
      { version: 1, name: 'v1', up: () => {} },
      { version: 2, name: 'v2', up: () => {} },
    ])

    const newCalled = { v3: false }
    const result = runner.run([
      { version: 1, name: 'v1', up: () => {} },
      { version: 2, name: 'v2', up: () => {} },
      { version: 3, name: 'v3', up: () => { newCalled.v3 = true } },
    ])

    expect(result.applied).toBe(1)
    expect(result.currentVersion).toBe(3)
    expect(newCalled.v3).toBe(true)
  })

  it('실제 테이블 생성 마이그레이션이 동작한다', () => {
    const runner = new MigrationRunner(db)

    runner.run([
      {
        version: 1,
        name: 'create_test_table',
        up: (database) => {
          database.exec(`
            CREATE TABLE test_table (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL
            )
          `)
        },
      },
    ])

    // 테이블이 생성되었는지 확인
    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='test_table'")
      .get() as { name: string } | undefined
    expect(table?.name).toBe('test_table')

    // 데이터 삽입/조회
    db.prepare("INSERT INTO test_table (id, name) VALUES (?, ?)").run('1', 'hello')
    const row = db.prepare("SELECT * FROM test_table WHERE id = ?").get('1') as { name: string }
    expect(row.name).toBe('hello')
  })

  it('마이그레이션 실패 시 전체 트랜잭션이 롤백된다', () => {
    const runner = new MigrationRunner(db)

    const migrations: Migration[] = [
      {
        version: 1,
        name: 'success',
        up: (database) => {
          database.exec("CREATE TABLE rollback_test (id TEXT PRIMARY KEY)")
        },
      },
      {
        version: 2,
        name: 'failure',
        up: () => {
          throw new Error('마이그레이션 실패')
        },
      },
    ]

    expect(() => runner.run(migrations)).toThrow('마이그레이션 실패')

    // 트랜잭션이 롤백되어 v1도 적용되지 않음
    expect(runner.getCurrentVersion()).toBe(0)
    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='rollback_test'")
      .get()
    expect(table).toBeUndefined()
  })

  it('schema_version에 마이그레이션 이력이 기록된다', () => {
    const runner = new MigrationRunner(db)
    runner.run([
      { version: 1, name: 'init', up: () => {} },
      { version: 2, name: 'add_users', up: () => {} },
    ])

    const rows = db.prepare("SELECT version, name FROM schema_version ORDER BY version").all() as Array<{
      version: number
      name: string
    }>
    expect(rows).toEqual([
      { version: 1, name: 'init' },
      { version: 2, name: 'add_users' },
    ])
  })
})
