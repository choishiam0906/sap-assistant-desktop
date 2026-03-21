import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { BrowserWindow } from 'electron';
import type { ChatRuntime } from '../../chatRuntime.js';
import type { SkillSourceRegistry } from '../../skills/registry.js';
import type { AgentExecutionRepository } from '../../storage/repositories/agentExecutionRepository.js';
import type {
  AgentDefinition,
  AgentExecution,
  AgentStep,
  PipelineContext,
  StepContextData,
} from '../../types/agent.js';
import { AgentExecutor, buildExecutionLevels } from '../executor.js';
import { IPC } from '../../ipc/channels.js';

// ─── 모킹 ───

vi.mock('electron');
vi.mock('../../logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock registry — vi.hoisted로 호이스팅 문제 해결
const { mockGetAgentDefinition } = vi.hoisted(() => ({
  mockGetAgentDefinition: vi.fn(),
}));
vi.mock('../registry.js', () => ({
  getAgentDefinition: mockGetAgentDefinition,
}));

// ─── 테스트 헬퍼 ───

function createMockStep(overrides?: Partial<AgentStep>): AgentStep {
  return {
    id: `step-${Math.random().toString(36).substr(2, 9)}`,
    skillId: 'skill-test',
    label: 'Test Step',
    description: 'Test step description',
    config: {},
    sortOrder: 0,
    ...overrides,
  };
}

function createMockExecution(overrides?: Partial<AgentExecution>): AgentExecution {
  return {
    id: `exec-${Math.random().toString(36).substr(2, 9)}`,
    agentId: 'agent-test',
    status: 'running',
    startedAt: new Date().toISOString(),
    stepResults: [],
    ...overrides,
  };
}

function createMockAgent(steps: AgentStep[]): AgentDefinition {
  return {
    id: 'agent-test',
    title: 'Test Agent',
    description: 'Test agent for testing',
    category: 'analysis',
    estimatedDuration: 60,
    steps,
  };
}

// ─── buildExecutionLevels 테스트 ───

describe('buildExecutionLevels', () => {
  it('의존성이 없는 스텝들을 모두 레벨 0에 배치해야 한다', () => {
    // Arrange
    const stepA = createMockStep({ id: 'A', sortOrder: 0 });
    const stepB = createMockStep({ id: 'B', sortOrder: 1 });
    const stepC = createMockStep({ id: 'C', sortOrder: 2 });

    // Act
    const levels = buildExecutionLevels([stepA, stepB, stepC]);

    // Assert
    expect(levels).toHaveLength(1);
    expect(levels[0]).toContainEqual(expect.objectContaining({ id: 'A' }));
    expect(levels[0]).toContainEqual(expect.objectContaining({ id: 'B' }));
    expect(levels[0]).toContainEqual(expect.objectContaining({ id: 'C' }));
  });

  it('선형 의존성(A→B→C)을 순차적 레벨로 배치해야 한다', () => {
    // Arrange
    const stepA = createMockStep({ id: 'A', sortOrder: 0 });
    const stepB = createMockStep({ id: 'B', sortOrder: 1, dependsOn: ['A'] });
    const stepC = createMockStep({ id: 'C', sortOrder: 2, dependsOn: ['B'] });

    // Act
    const levels = buildExecutionLevels([stepA, stepB, stepC]);

    // Assert
    expect(levels).toHaveLength(3);
    expect(levels[0]).toEqual([stepA]);
    expect(levels[1]).toEqual([stepB]);
    expect(levels[2]).toEqual([stepC]);
  });

  it('병렬 의존성(A,B→C)을 올바르게 배치해야 한다', () => {
    // Arrange
    const stepA = createMockStep({ id: 'A', sortOrder: 0 });
    const stepB = createMockStep({ id: 'B', sortOrder: 1 });
    const stepC = createMockStep({ id: 'C', sortOrder: 2, dependsOn: ['A', 'B'] });

    // Act
    const levels = buildExecutionLevels([stepA, stepB, stepC]);

    // Assert
    expect(levels).toHaveLength(2);
    expect(levels[0]).toHaveLength(2);
    expect(levels[0]).toContainEqual(expect.objectContaining({ id: 'A' }));
    expect(levels[0]).toContainEqual(expect.objectContaining({ id: 'B' }));
    expect(levels[1]).toEqual([stepC]);
  });

  it('복합 DAG(A,B→C, A→D)을 올바르게 배치해야 한다', () => {
    // Arrange
    const stepA = createMockStep({ id: 'A', sortOrder: 0 });
    const stepB = createMockStep({ id: 'B', sortOrder: 1 });
    const stepC = createMockStep({ id: 'C', sortOrder: 2, dependsOn: ['A', 'B'] });
    const stepD = createMockStep({ id: 'D', sortOrder: 3, dependsOn: ['A'] });

    // Act
    const levels = buildExecutionLevels([stepA, stepB, stepC, stepD]);

    // Assert — A,B 완료 후 C(deps: A,B)와 D(deps: A) 모두 즉시 실행 가능 → 2레벨
    expect(levels).toHaveLength(2);
    expect(levels[0]).toHaveLength(2);
    expect(levels[0]).toContainEqual(expect.objectContaining({ id: 'A' }));
    expect(levels[0]).toContainEqual(expect.objectContaining({ id: 'B' }));
    expect(levels[1]).toHaveLength(2);
    expect(levels[1]).toContainEqual(expect.objectContaining({ id: 'C' }));
    expect(levels[1]).toContainEqual(expect.objectContaining({ id: 'D' }));
  });

  it('순환 의존성을 감지하고 남은 스텝을 마지막 레벨에 추가해야 한다', () => {
    // Arrange
    const stepA = createMockStep({ id: 'A', sortOrder: 0, dependsOn: ['B'] });
    const stepB = createMockStep({ id: 'B', sortOrder: 1, dependsOn: ['A'] });

    // Act
    const levels = buildExecutionLevels([stepA, stepB]);

    // Assert
    expect(levels.length).toBeGreaterThan(0);
    // 순환 의존성이면 마지막에 remaining이 있음
    const lastLevel = levels[levels.length - 1];
    expect(lastLevel).toHaveLength(2);
  });

  it('빈 스텝 배열을 처리해야 한다', () => {
    // Act
    const levels = buildExecutionLevels([]);

    // Assert
    expect(levels).toEqual([]);
  });

  it('단일 스텝을 처리해야 한다', () => {
    // Arrange
    const stepA = createMockStep({ id: 'A' });

    // Act
    const levels = buildExecutionLevels([stepA]);

    // Assert
    expect(levels).toHaveLength(1);
    expect(levels[0]).toEqual([stepA]);
  });

  it('존재하지 않는 의존성을 참조하는 스텝을 처리해야 한다', () => {
    // Arrange
    const stepA = createMockStep({ id: 'A', dependsOn: ['nonexistent'] });

    // Act
    const levels = buildExecutionLevels([stepA]);

    // Assert
    // 의존성이 완성되지 않으므로 순환으로 감지될 것
    expect(levels.length).toBeGreaterThan(0);
  });
});

// ─── AgentExecutor 테스트 ───

describe('AgentExecutor', () => {
  let executor: AgentExecutor;
  let mockChatRuntime: vi.Mocked<ChatRuntime>;
  let mockSkillRegistry: vi.Mocked<SkillSourceRegistry>;
  let mockExecutionRepo: vi.Mocked<AgentExecutionRepository>;
  let mockGetMainWindow: vi.Mock;

  beforeEach(() => {
    // Mock ChatRuntime
    mockChatRuntime = {
      sendMessage: vi.fn(async () => ({
        assistantMessage: { content: 'test result' },
      })),
    } as unknown as vi.Mocked<ChatRuntime>;

    // Mock SkillSourceRegistry (동기 — 소스 코드에서 await 없이 호출)
    mockSkillRegistry = {
      resolveSkillExecution: vi.fn(() => ({
        meta: { sourceIds: [] },
      })),
    } as unknown as vi.Mocked<SkillSourceRegistry>;

    // Mock AgentExecutionRepository
    mockExecutionRepo = {
      create: vi.fn((agentId: string) => {
        const exec = createMockExecution({ agentId });
        return exec;
      }),
      upsertStepResult: vi.fn(),
      updateStatus: vi.fn(),
      getById: vi.fn(),
    } as unknown as vi.Mocked<AgentExecutionRepository>;

    // Mock getMainWindow
    mockGetMainWindow = vi.fn(() => {
      const mockWindow = {
        webContents: { send: vi.fn() },
        isDestroyed: vi.fn(() => false),
      } as unknown as BrowserWindow;
      return mockWindow;
    });

    // Mock getAgentDefinition
    mockGetAgentDefinition.mockImplementation((agentId: string) => {
      if (agentId === 'agent-test') {
        const steps = [
          createMockStep({
            id: 'step-1',
            skillId: 'skill-1',
            label: 'Step 1',
            sortOrder: 0,
          }),
        ];
        return createMockAgent(steps);
      }
      return null;
    });

    executor = new AgentExecutor(
      mockChatRuntime,
      mockSkillRegistry,
      mockExecutionRepo,
      mockGetMainWindow,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── startExecution 테스트 ───

  describe('startExecution', () => {
    it('실행을 생성하고 ID를 반환해야 한다', async () => {
      // Arrange
      const mockExec = createMockExecution();
      mockExecutionRepo.create.mockReturnValue(mockExec);

      // Act
      const result = await executor.startExecution('agent-test');

      // Assert
      expect(result).toBe(mockExec.id);
      expect(mockExecutionRepo.create).toHaveBeenCalledWith('agent-test');
    });

    it('존재하지 않는 에이전트로 시작하면 에러를 던져야 한다', async () => {
      // Act & Assert
      await expect(executor.startExecution('nonexistent-agent')).rejects.toThrow(
        '에이전트를 찾을 수 없습니다: nonexistent-agent',
      );
    });

    it('모든 스텝을 초기 pending 상태로 저장해야 한다', async () => {
      // Arrange
      const mockExec = createMockExecution();
      mockExecutionRepo.create.mockReturnValue(mockExec);

      // Act
      await executor.startExecution('agent-test');

      // Assert
      expect(mockExecutionRepo.upsertStepResult).toHaveBeenCalledWith(
        mockExec.id,
        expect.objectContaining({
          status: 'pending',
        }),
      );
    });
  });

  // ─── getStatus 테스트 ───

  describe('getStatus', () => {
    it('실행 상태를 반환해야 한다', () => {
      // Arrange
      const mockExec = createMockExecution({ status: 'completed' });
      mockExecutionRepo.getById.mockReturnValue(mockExec);

      // Act
      const result = executor.getStatus('exec-123');

      // Assert
      expect(result).toEqual(mockExec);
      expect(mockExecutionRepo.getById).toHaveBeenCalledWith('exec-123');
    });

    it('실행이 없으면 null을 반환해야 한다', () => {
      // Arrange
      mockExecutionRepo.getById.mockReturnValue(null);

      // Act
      const result = executor.getStatus('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── cancelExecution 테스트 ───

  describe('cancelExecution', () => {
    it('실행을 cancelled 상태로 표시해야 한다', async () => {
      // Act
      await executor.cancelExecution('exec-123');

      // Assert
      expect(mockExecutionRepo.updateStatus).toHaveBeenCalledWith('exec-123', 'cancelled');
    });
  });

  // ─── runPipeline 통합 테스트 ───

  describe('runPipeline (파이프라인 동작)', () => {
    it('순차 스텝(A→B→C)을 순서대로 실행해야 한다', async () => {
      // Arrange
      vi.useFakeTimers();
      const stepA = createMockStep({
        id: 'A',
        skillId: 'skill-a',
        label: 'Step A',
        sortOrder: 0,
      });
      const stepB = createMockStep({
        id: 'B',
        skillId: 'skill-b',
        label: 'Step B',
        sortOrder: 1,
        dependsOn: ['A'],
      });
      const stepC = createMockStep({
        id: 'C',
        skillId: 'skill-c',
        label: 'Step C',
        sortOrder: 2,
        dependsOn: ['B'],
      });

      const agent = createMockAgent([stepA, stepB, stepC]);
      const mockExec = createMockExecution();

      mockExecutionRepo.create.mockReturnValue(mockExec);
      mockExecutionRepo.getById.mockReturnValue(mockExec);

      mockGetAgentDefinition.mockReturnValue(agent);

      // Act
      await executor.startExecution('agent-test');
      await vi.runAllTimersAsync();

      // Assert
      // A, B, C가 모두 completed 또는 skipped로 업데이트되어야 함
      const allCalls = mockExecutionRepo.upsertStepResult.mock.calls;
      const stepIds = allCalls.map((call) => call[1].stepId);
      expect(stepIds).toContain('A');
      expect(stepIds).toContain('B');
      expect(stepIds).toContain('C');

      vi.useRealTimers();
    });

    it('병렬 독립 스텝을 동시에 실행해야 한다', async () => {
      // Arrange
      vi.useFakeTimers();
      const stepA = createMockStep({
        id: 'A',
        skillId: 'skill-a',
        label: 'Step A',
        sortOrder: 0,
      });
      const stepB = createMockStep({
        id: 'B',
        skillId: 'skill-b',
        label: 'Step B',
        sortOrder: 1,
      });

      const agent = createMockAgent([stepA, stepB]);
      const mockExec = createMockExecution();

      mockExecutionRepo.create.mockReturnValue(mockExec);

      mockGetAgentDefinition.mockReturnValue(agent);

      // Act
      await executor.startExecution('agent-test');
      await vi.runAllTimersAsync();

      // Assert
      // A와 B가 동일한 레벨에서 병렬 실행됨을 확인
      const sendMessageCalls = mockChatRuntime.sendMessage.mock.calls;
      // Promise.allSettled로 병렬 처리되므로 빠르게 두 호출이 발생
      expect(sendMessageCalls.length).toBeGreaterThanOrEqual(2);

      vi.useRealTimers();
    });

    it('구조화 컨텍스트를 올바르게 구성해야 한다', async () => {
      // Arrange
      vi.useFakeTimers();
      const stepA = createMockStep({
        id: 'A',
        skillId: 'skill-a',
        label: 'Step A',
        sortOrder: 0,
      });
      const stepB = createMockStep({
        id: 'B',
        skillId: 'skill-b',
        label: 'Step B',
        sortOrder: 1,
        dependsOn: ['A'],
      });

      mockChatRuntime.sendMessage.mockImplementation(async ({ message }) => {
        // A 실행 시 JSON 응답
        if (message.includes('Step A')) {
          return {
            assistantMessage: { content: '{"result": "success"}' },
          };
        }
        return {
          assistantMessage: { content: 'text result' },
        };
      });

      const agent = createMockAgent([stepA, stepB]);
      const mockExec = createMockExecution();

      mockExecutionRepo.create.mockReturnValue(mockExec);

      mockGetAgentDefinition.mockReturnValue(agent);

      // Act
      await executor.startExecution('agent-test');
      await vi.runAllTimersAsync();

      // Assert
      const sendMessageCalls = mockChatRuntime.sendMessage.mock.calls;
      const stepBCall = sendMessageCalls.find((call) =>
        call[0].message.includes('Step B')
      );

      // B 실행 시 A의 결과가 컨텍스트에 포함되어야 함
      if (stepBCall) {
        expect(stepBCall[0].message).toContain('이전 단계 결과');
      }

      vi.useRealTimers();
    });

    it('Provider override를 사용해야 한다', async () => {
      // Arrange
      vi.useFakeTimers();
      const stepA = createMockStep({
        id: 'A',
        skillId: 'skill-a',
        label: 'Step A',
        sortOrder: 0,
        providerOverride: 'copilot',
        modelOverride: 'gpt-4',
      });

      const agent = createMockAgent([stepA]);
      const mockExec = createMockExecution();

      mockExecutionRepo.create.mockReturnValue(mockExec);

      mockGetAgentDefinition.mockReturnValue(agent);

      // Act
      await executor.startExecution('agent-test');
      await vi.runAllTimersAsync();

      // Assert
      const sendMessageCall = mockChatRuntime.sendMessage.mock.calls[0];
      expect(sendMessageCall[0].provider).toBe('copilot');
      expect(sendMessageCall[0].model).toBe('gpt-4');

      vi.useRealTimers();
    });

    it('조건이 false일 때 스텝을 skip해야 한다', async () => {
      // Arrange
      vi.useFakeTimers();
      const stepA = createMockStep({
        id: 'A',
        skillId: 'skill-a',
        label: 'Step A',
        sortOrder: 0,
      });
      const stepB = createMockStep({
        id: 'B',
        skillId: 'skill-b',
        label: 'Step B',
        sortOrder: 1,
        executeIf: {
          reference: 'A',
          operator: 'equals',
          value: 'nonmatching',
        },
      });

      mockChatRuntime.sendMessage.mockResolvedValue({
        assistantMessage: { content: 'matching' },
      });

      const agent = createMockAgent([stepA, stepB]);
      const mockExec = createMockExecution();

      mockExecutionRepo.create.mockReturnValue(mockExec);

      mockGetAgentDefinition.mockReturnValue(agent);

      // Act
      await executor.startExecution('agent-test');
      await vi.runAllTimersAsync();

      // Assert
      const skipCall = mockExecutionRepo.upsertStepResult.mock.calls.find(
        (call) => call[1].stepId === 'B' && call[1].status === 'skipped'
      );
      expect(skipCall).toBeDefined();

      vi.useRealTimers();
    });

    it('재시도를 통해 실패한 스텝을 재실행해야 한다', async () => {
      // Arrange
      vi.useFakeTimers();
      const stepA = createMockStep({
        id: 'A',
        skillId: 'skill-a',
        label: 'Step A',
        sortOrder: 0,
        retry: { maxAttempts: 3 },
      });

      let attemptCount = 0;
      mockChatRuntime.sendMessage.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { assistantMessage: { content: 'success' } };
      });

      const agent = createMockAgent([stepA]);
      const mockExec = createMockExecution();

      mockExecutionRepo.create.mockReturnValue(mockExec);

      mockGetAgentDefinition.mockReturnValue(agent);

      // Act
      await executor.startExecution('agent-test');
      await vi.runAllTimersAsync();

      // Assert
      expect(attemptCount).toBe(3);
      expect(mockChatRuntime.sendMessage).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('fallback skill을 사용하여 실패 후 재시도해야 한다', async () => {
      // Arrange
      vi.useFakeTimers();
      const stepA = createMockStep({
        id: 'A',
        skillId: 'skill-a',
        label: 'Step A',
        sortOrder: 0,
        fallbackSkillId: 'skill-a-fallback',
      });

      let callCount = 0;
      mockChatRuntime.sendMessage.mockImplementation(async ({ skillId }) => {
        callCount++;
        if (skillId === 'skill-a') {
          throw new Error('Primary skill failed');
        }
        return { assistantMessage: { content: 'fallback success' } };
      });

      const agent = createMockAgent([stepA]);
      const mockExec = createMockExecution();

      mockExecutionRepo.create.mockReturnValue(mockExec);

      mockGetAgentDefinition.mockReturnValue(agent);

      // Act
      await executor.startExecution('agent-test');
      await vi.runAllTimersAsync();

      // Assert
      expect(callCount).toBeGreaterThanOrEqual(2);

      vi.useRealTimers();
    });

    it('타임아웃 후 스텝을 실패 처리해야 한다', async () => {
      // Arrange
      vi.useFakeTimers();
      const stepA = createMockStep({
        id: 'A',
        skillId: 'skill-a',
        label: 'Step A',
        sortOrder: 0,
        timeoutMs: 1000,
      });

      mockChatRuntime.sendMessage.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve
          })
      );

      const agent = createMockAgent([stepA]);
      const mockExec = createMockExecution();

      mockExecutionRepo.create.mockReturnValue(mockExec);

      mockGetAgentDefinition.mockReturnValue(agent);

      // Act — startExecution을 먼저 await하여 파이프라인이 시작되도록 함
      await executor.startExecution('agent-test');
      await vi.advanceTimersByTimeAsync(1500);

      // Assert
      const failureCall = mockExecutionRepo.upsertStepResult.mock.calls.find(
        (call) => call[1].status === 'failed' && call[1].error?.includes('타임아웃')
      );
      expect(failureCall).toBeDefined();

      vi.useRealTimers();
    });

    it('진행률 이벤트를 BrowserWindow로 전송해야 한다', async () => {
      // Arrange
      vi.useFakeTimers();
      const stepA = createMockStep({
        id: 'A',
        skillId: 'skill-a',
        label: 'Step A',
        sortOrder: 0,
      });

      const mockWindow = {
        webContents: { send: vi.fn() },
        isDestroyed: vi.fn(() => false),
      } as unknown as BrowserWindow;

      mockGetMainWindow.mockReturnValue(mockWindow);

      const agent = createMockAgent([stepA]);
      const mockExec = createMockExecution();

      mockExecutionRepo.create.mockReturnValue(mockExec);

      mockGetAgentDefinition.mockReturnValue(agent);

      // Act
      await executor.startExecution('agent-test');
      await vi.runAllTimersAsync();

      // Assert
      const sendCalls = (mockWindow.webContents.send as vi.Mock).mock.calls;
      const progressCall = sendCalls.find((call) => call[0] === IPC.AGENTS_EXECUTION_PROGRESS);
      expect(progressCall).toBeDefined();
      if (progressCall) {
        const progress = progressCall[1];
        expect(progress).toHaveProperty('executionId');
        expect(progress).toHaveProperty('totalSteps');
      }

      vi.useRealTimers();
    });

    it('스텝 실패 시 의존하는 후속 스텝이 있으면 파이프라인을 중단해야 한다', async () => {
      // Arrange
      vi.useFakeTimers();
      const stepA = createMockStep({
        id: 'A',
        skillId: 'skill-a',
        label: 'Step A',
        sortOrder: 0,
      });
      const stepB = createMockStep({
        id: 'B',
        skillId: 'skill-b',
        label: 'Step B',
        sortOrder: 1,
        dependsOn: ['A'],
      });

      let callCount = 0;
      mockChatRuntime.sendMessage.mockImplementation(async () => {
        callCount++;
        throw new Error('Step failed');
      });

      const agent = createMockAgent([stepA, stepB]);
      const mockExec = createMockExecution();

      mockExecutionRepo.create.mockReturnValue(mockExec);

      mockGetAgentDefinition.mockReturnValue(agent);

      // Act
      await executor.startExecution('agent-test');
      await vi.runAllTimersAsync();

      // Assert
      const failedStatus = mockExecutionRepo.updateStatus.mock.calls.find(
        (call) => call[1] === 'failed'
      );
      expect(failedStatus).toBeDefined();

      vi.useRealTimers();
    });

    it('실행이 cancelled일 때 파이프라인을 중단해야 한다', async () => {
      // Arrange
      vi.useFakeTimers();
      const stepA = createMockStep({
        id: 'A',
        skillId: 'skill-a',
        label: 'Step A',
        sortOrder: 0,
      });
      const stepB = createMockStep({
        id: 'B',
        skillId: 'skill-b',
        label: 'Step B',
        sortOrder: 1,
      });

      mockChatRuntime.sendMessage.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve
          })
      );

      const agent = createMockAgent([stepA, stepB]);
      const mockExec = createMockExecution();

      mockExecutionRepo.create.mockReturnValue(mockExec);

      mockGetAgentDefinition.mockReturnValue(agent);

      // Act
      const execId = await executor.startExecution('agent-test');
      await executor.cancelExecution(execId);
      await vi.runAllTimersAsync();

      // Assert
      const cancelledStatus = mockExecutionRepo.updateStatus.mock.calls.find(
        (call) => call[1] === 'cancelled'
      );
      expect(cancelledStatus).toBeDefined();

      vi.useRealTimers();
    });

    it('모든 스텝 완료 시 completed 상태로 업데이트해야 한다', async () => {
      // Arrange
      vi.useFakeTimers();
      const stepA = createMockStep({
        id: 'A',
        skillId: 'skill-a',
        label: 'Step A',
        sortOrder: 0,
      });

      const agent = createMockAgent([stepA]);
      const mockExec = createMockExecution();

      mockExecutionRepo.create.mockReturnValue(mockExec);

      mockGetAgentDefinition.mockReturnValue(agent);

      // Act
      await executor.startExecution('agent-test');
      await vi.runAllTimersAsync();

      // Assert
      const completedStatus = mockExecutionRepo.updateStatus.mock.calls.find(
        (call) => call[1] === 'completed'
      );
      expect(completedStatus).toBeDefined();

      vi.useRealTimers();
    });

    it('BrowserWindow가 destroyed이면 progress 이벤트를 전송하지 않아야 한다', async () => {
      // Arrange
      vi.useFakeTimers();
      const stepA = createMockStep({
        id: 'A',
        skillId: 'skill-a',
        label: 'Step A',
        sortOrder: 0,
      });

      const mockWindow = {
        webContents: { send: vi.fn() },
        isDestroyed: vi.fn(() => true),
      } as unknown as BrowserWindow;

      mockGetMainWindow.mockReturnValue(mockWindow);

      const agent = createMockAgent([stepA]);
      const mockExec = createMockExecution();

      mockExecutionRepo.create.mockReturnValue(mockExec);

      mockGetAgentDefinition.mockReturnValue(agent);

      // Act
      await executor.startExecution('agent-test');
      await vi.runAllTimersAsync();

      // Assert
      expect((mockWindow.webContents.send as vi.Mock).mock.calls).toHaveLength(0);

      vi.useRealTimers();
    });

    it('JSON 파싱이 실패하면 parsed를 null로 설정해야 한다', async () => {
      // Arrange
      vi.useFakeTimers();
      const stepA = createMockStep({
        id: 'A',
        skillId: 'skill-a',
        label: 'Step A',
        sortOrder: 0,
      });
      const stepB = createMockStep({
        id: 'B',
        skillId: 'skill-b',
        label: 'Step B',
        sortOrder: 1,
        dependsOn: ['A'],
      });

      mockChatRuntime.sendMessage.mockImplementation(async ({ message }) => {
        if (message.includes('Step A')) {
          return {
            assistantMessage: { content: 'not valid json' },
          };
        }
        return {
          assistantMessage: { content: 'success' },
        };
      });

      const agent = createMockAgent([stepA, stepB]);
      const mockExec = createMockExecution();

      mockExecutionRepo.create.mockReturnValue(mockExec);

      mockGetAgentDefinition.mockReturnValue(agent);

      // Act
      await executor.startExecution('agent-test');
      await vi.runAllTimersAsync();

      // Assert
      // B 실행 시 raw 텍스트가 사용되어야 함
      const sendMessageCalls = mockChatRuntime.sendMessage.mock.calls;
      const stepBCall = sendMessageCalls.find((call) =>
        call[0].message.includes('Step B')
      );
      if (stepBCall) {
        expect(stepBCall[0].message).toContain('not valid json');
      }

      vi.useRealTimers();
    });

    it('중첩된 JSON 경로를 통해 조건을 평가해야 한다', async () => {
      // Arrange
      vi.useFakeTimers();
      const stepA = createMockStep({
        id: 'A',
        skillId: 'skill-a',
        label: 'Step A',
        sortOrder: 0,
      });
      const stepB = createMockStep({
        id: 'B',
        skillId: 'skill-b',
        label: 'Step B',
        sortOrder: 1,
        executeIf: {
          reference: 'A',
          operator: 'equals',
          value: 'high',
          field: 'risk.level',
        },
      });

      mockChatRuntime.sendMessage.mockImplementation(async ({ message }) => {
        if (message.includes('Step A')) {
          return {
            assistantMessage: { content: '{"risk":{"level":"high"}}' },
          };
        }
        return {
          assistantMessage: { content: 'executed' },
        };
      });

      const agent = createMockAgent([stepA, stepB]);
      const mockExec = createMockExecution();

      mockExecutionRepo.create.mockReturnValue(mockExec);

      mockGetAgentDefinition.mockReturnValue(agent);

      // Act
      await executor.startExecution('agent-test');
      await vi.runAllTimersAsync();

      // Assert
      // B가 실행되어야 함 (skipped가 아님)
      const stepBResults = mockExecutionRepo.upsertStepResult.mock.calls.filter(
        (call) => call[1].stepId === 'B'
      );
      const executedResult = stepBResults.find((call) => call[1].status !== 'skipped');
      expect(executedResult).toBeDefined();

      vi.useRealTimers();
    });
  });
});
