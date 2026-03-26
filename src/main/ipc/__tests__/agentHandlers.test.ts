import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock electron
const mockHandlers = new Map<string, Function>();
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: Function) => {
      mockHandlers.set(channel, handler);
    }),
  },
  shell: {
    openPath: vi.fn(),
  },
}));

// Mock registry functions
vi.mock('../../agents/registry.js', () => ({
  listAgentDefinitions: vi.fn(() => [
    {
      id: 'test-agent-1',
      title: 'Test Agent 1',
      description: 'Test',
      category: 'analysis',
      estimatedDuration: 100,
      steps: [],
    },
  ]),
  getAgentDefinition: vi.fn((id: string) => {
    if (id === 'test-agent-1') {
      return {
        id: 'test-agent-1',
        title: 'Test Agent 1',
        description: 'Test',
        category: 'analysis',
        estimatedDuration: 100,
        steps: [],
      };
    }
    return null;
  }),
  listCustomAgentDefinitions: vi.fn(() => []),
}));

// Mock agentLoaderService
vi.mock('../../agents/agentLoaderService.js', () => ({
  saveCustomAgent: vi.fn(),
  deleteCustomAgent: vi.fn(),
  getAgentFolderPath: vi.fn(() => '/test/agents'),
}));

// Mock wrapHandler
vi.mock('../helpers/wrapHandler.js', () => ({
  wrapHandler: (channel: string, fn: Function) => {
    return async (...args: unknown[]) => {
      try {
        return await fn(...args);
      } catch (err) {
        throw new Error(`[${channel}] ${err instanceof Error ? err.message : String(err)}`);
      }
    };
  },
}));

import { registerAgentHandlers } from '../agentHandlers.js';
import {
  listAgentDefinitions,
  getAgentDefinition,
  listCustomAgentDefinitions,
} from '../../agents/registry.js';
import {
  saveCustomAgent,
  deleteCustomAgent,
  getAgentFolderPath,
} from '../../agents/agentLoaderService.js';
import { IPC } from '../channels.js';
import type { IpcContext } from '../types.js';

// Helper to create mock context
function createMockContext(): IpcContext {
  return {
    oauthManager: {} as never,
    chatRuntime: {} as never,
    cboAnalyzer: {} as never,
    cboBatchRuntime: {} as never,
    auditRepo: {} as never,
    vaultRepo: {} as never,
    sessionRepo: {} as never,
    skillRegistry: {} as never,
    configuredSourceRepo: {} as never,
    sourceDocumentRepo: {} as never,
    localFolderLibrary: {} as never,
    mcpConnector: {} as never,
    closingPlanRepo: {} as never,
    closingStepRepo: {} as never,
    routineTemplateRepo: {} as never,
    routineExecutionRepo: {} as never,
    routineKnowledgeLinkRepo: {} as never,
    routineExecutor: {} as never,
    routineScheduler: {} as never,
    scheduledTaskRepo: {} as never,
    scheduleLogRepo: {} as never,
    agentExecutionRepo: {
      list: vi.fn(),
    } as never,
    agentExecutor: {
      startExecution: vi.fn(),
      getStatus: vi.fn(),
      cancelExecution: vi.fn(),
    } as never,
    getMainWindow: vi.fn(),
  };
}

describe('registerAgentHandlers', () => {
  let mockContext: IpcContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHandlers.clear();
    mockContext = createMockContext();
  });

  // ─── Handler Registration ───

  it('registers all expected IPC channels', () => {
    registerAgentHandlers(mockContext);

    const expectedChannels = [
      IPC.AGENTS_LIST,
      IPC.AGENTS_GET,
      IPC.AGENTS_EXECUTE,
      IPC.AGENTS_EXECUTION_STATUS,
      IPC.AGENTS_EXECUTIONS_LIST,
      IPC.AGENTS_EXECUTION_CANCEL,
      IPC.AGENTS_LIST_CUSTOM,
      IPC.AGENTS_SAVE_CUSTOM,
      IPC.AGENTS_DELETE_CUSTOM,
      IPC.AGENTS_OPEN_FOLDER,
    ];

    expectedChannels.forEach((channel) => {
      expect(mockHandlers.has(channel)).toBe(true);
    });
  });

  // ─── AGENTS_LIST ───

  it('AGENTS_LIST handler returns list of agents', async () => {
    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_LIST) as Function;
    const result = await handler();

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('id', 'test-agent-1');
    expect(listAgentDefinitions).toHaveBeenCalled();
  });

  it('AGENTS_LIST handler calls listAgentDefinitions', async () => {
    registerAgentHandlers(mockContext);

    vi.mocked(listAgentDefinitions).mockClear();

    const handler = mockHandlers.get(IPC.AGENTS_LIST) as Function;
    await handler();

    expect(listAgentDefinitions).toHaveBeenCalledTimes(1);
  });

  // ─── AGENTS_GET ───

  it('AGENTS_GET handler returns agent by ID', async () => {
    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_GET) as Function;
    const result = await handler(undefined, 'test-agent-1');

    expect(result).toHaveProperty('id', 'test-agent-1');
    expect(getAgentDefinition).toHaveBeenCalledWith('test-agent-1');
  });

  it('AGENTS_GET handler returns null for unknown agent', async () => {
    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_GET) as Function;
    const result = await handler(undefined, 'nonexistent');

    expect(result).toBeNull();
    expect(getAgentDefinition).toHaveBeenCalledWith('nonexistent');
  });

  it('AGENTS_GET handler passes IPC event object as first argument', async () => {
    registerAgentHandlers(mockContext);

    vi.mocked(getAgentDefinition).mockClear();

    const handler = mockHandlers.get(IPC.AGENTS_GET) as Function;
    await handler({ sender: {} } as any, 'test-agent-1');

    expect(getAgentDefinition).toHaveBeenCalledWith('test-agent-1');
  });

  // ─── AGENTS_EXECUTE ───

  it('AGENTS_EXECUTE handler calls agentExecutor.startExecution', async () => {
    const mockExecution = { id: 'exec-1', agentId: 'test-agent-1', status: 'running' };
    vi.mocked(mockContext.agentExecutor.startExecution).mockResolvedValue(
      mockExecution as any
    );

    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_EXECUTE) as Function;
    const result = await handler(undefined, 'test-agent-1');

    expect(mockContext.agentExecutor.startExecution).toHaveBeenCalledWith('test-agent-1');
    expect(result).toEqual(mockExecution);
  });

  it('AGENTS_EXECUTE handler is async', async () => {
    vi.mocked(mockContext.agentExecutor.startExecution).mockResolvedValue({} as any);

    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_EXECUTE) as Function;
    const result = handler(undefined, 'test-agent-1');

    expect(result).toBeInstanceOf(Promise);
    await result;
  });

  // ─── AGENTS_EXECUTION_STATUS ───

  it('AGENTS_EXECUTION_STATUS handler calls agentExecutor.getStatus', async () => {
    const mockStatus = { executionId: 'exec-1', completedSteps: 2, totalSteps: 3 };
    vi.mocked(mockContext.agentExecutor.getStatus).mockReturnValue(mockStatus as any);

    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_EXECUTION_STATUS) as Function;
    const result = await handler(undefined, 'exec-1');

    expect(mockContext.agentExecutor.getStatus).toHaveBeenCalledWith('exec-1');
    expect(result).toEqual(mockStatus);
  });

  it('AGENTS_EXECUTION_STATUS handler receives execution ID', async () => {
    vi.mocked(mockContext.agentExecutor.getStatus).mockReturnValue(null);

    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_EXECUTION_STATUS) as Function;
    await handler(undefined, 'my-execution-123');

    expect(mockContext.agentExecutor.getStatus).toHaveBeenCalledWith('my-execution-123');
  });

  // ─── AGENTS_EXECUTIONS_LIST ───

  it('AGENTS_EXECUTIONS_LIST handler calls agentExecutionRepo.list', async () => {
    const mockList = [
      { id: 'exec-1', agentId: 'test-agent-1' },
      { id: 'exec-2', agentId: 'test-agent-1' },
    ];
    vi.mocked(mockContext.agentExecutionRepo.list).mockResolvedValue(mockList as any);

    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_EXECUTIONS_LIST) as Function;
    const result = await handler(undefined);

    expect(mockContext.agentExecutionRepo.list).toHaveBeenCalledWith(undefined);
    expect(result).toEqual(mockList);
  });

  it('AGENTS_EXECUTIONS_LIST handler passes options to list method', async () => {
    vi.mocked(mockContext.agentExecutionRepo.list).mockResolvedValue([]);

    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_EXECUTIONS_LIST) as Function;
    const options = { limit: 10, offset: 0 };
    await handler(undefined, options);

    expect(mockContext.agentExecutionRepo.list).toHaveBeenCalledWith(options);
  });

  // ─── AGENTS_EXECUTION_CANCEL ───

  it('AGENTS_EXECUTION_CANCEL handler calls agentExecutor.cancelExecution', async () => {
    vi.mocked(mockContext.agentExecutor.cancelExecution).mockResolvedValue(undefined);

    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_EXECUTION_CANCEL) as Function;
    await handler(undefined, 'exec-1');

    expect(mockContext.agentExecutor.cancelExecution).toHaveBeenCalledWith('exec-1');
  });

  it('AGENTS_EXECUTION_CANCEL handler is async', async () => {
    vi.mocked(mockContext.agentExecutor.cancelExecution).mockResolvedValue(undefined);

    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_EXECUTION_CANCEL) as Function;
    const result = handler(undefined, 'exec-1');

    expect(result).toBeInstanceOf(Promise);
    await result;
  });

  // ─── AGENTS_LIST_CUSTOM ───

  it('AGENTS_LIST_CUSTOM handler returns custom agents', async () => {
    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_LIST_CUSTOM) as Function;
    const result = await handler();

    expect(result).toEqual([]);
    expect(listCustomAgentDefinitions).toHaveBeenCalled();
  });

  // ─── AGENTS_SAVE_CUSTOM ───

  it('AGENTS_SAVE_CUSTOM handler calls saveCustomAgent', async () => {
    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_SAVE_CUSTOM) as Function;
    const content = '{ "id": "test" }';
    const fileName = 'test-agent.json';

    await handler(undefined, content, fileName);

    expect(saveCustomAgent).toHaveBeenCalledWith(content, fileName);
  });

  // ─── AGENTS_DELETE_CUSTOM ───

  it('AGENTS_DELETE_CUSTOM handler calls deleteCustomAgent', async () => {
    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_DELETE_CUSTOM) as Function;
    const fileName = 'test-agent.json';

    await handler(undefined, fileName);

    expect(deleteCustomAgent).toHaveBeenCalledWith(fileName);
  });

  // ─── AGENTS_OPEN_FOLDER ───

  it('AGENTS_OPEN_FOLDER handler calls shell.openPath with agent folder path', async () => {
    const { shell } = await import('electron');

    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_OPEN_FOLDER) as Function;
    await handler();

    expect(getAgentFolderPath).toHaveBeenCalled();
    expect(shell.openPath).toHaveBeenCalledWith('/test/agents');
  });

  it('AGENTS_OPEN_FOLDER handler is async', async () => {
    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_OPEN_FOLDER) as Function;
    const result = handler();

    expect(result).toBeInstanceOf(Promise);
    await result;
  });

  // ─── Error Handling ───

  it('handler error is caught by wrapHandler', async () => {
    vi.mocked(mockContext.agentExecutor.startExecution).mockRejectedValue(
      new Error('Execution failed')
    );

    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_EXECUTE) as Function;

    await expect(handler(undefined, 'test-agent-1')).rejects.toThrow(
      /Execution failed/
    );
  });

  it('handler error includes channel name in wrapped error', async () => {
    vi.mocked(mockContext.agentExecutor.startExecution).mockRejectedValue(
      new Error('Execution failed')
    );

    registerAgentHandlers(mockContext);

    const handler = mockHandlers.get(IPC.AGENTS_EXECUTE) as Function;

    await expect(handler(undefined, 'test-agent-1')).rejects.toThrow(
      /\[/
    );
  });

  // ─── Integration Scenarios ───

  it('lists and retrieves agents in sequence', async () => {
    registerAgentHandlers(mockContext);

    const listHandler = mockHandlers.get(IPC.AGENTS_LIST) as Function;
    const getHandler = mockHandlers.get(IPC.AGENTS_GET) as Function;

    const agents = await listHandler();
    expect(agents).toHaveLength(1);

    const agent = await getHandler(undefined, agents[0].id);
    expect(agent).toEqual(agents[0]);
  });

  it('executes and checks status of an execution', async () => {
    const execId = 'exec-test-123';
    vi.mocked(mockContext.agentExecutor.startExecution).mockResolvedValue({
      id: execId,
      agentId: 'test-agent-1',
      status: 'running',
    } as any);

    vi.mocked(mockContext.agentExecutor.getStatus).mockReturnValue({
      executionId: execId,
      completedSteps: 1,
      totalSteps: 3,
    } as any);

    registerAgentHandlers(mockContext);

    const executeHandler = mockHandlers.get(IPC.AGENTS_EXECUTE) as Function;
    const statusHandler = mockHandlers.get(IPC.AGENTS_EXECUTION_STATUS) as Function;

    const execution = await executeHandler(undefined, 'test-agent-1');
    expect(execution.id).toBe(execId);

    const status = await statusHandler(undefined, execId);
    expect(status.completedSteps).toBe(1);
    expect(status.totalSteps).toBe(3);
  });

  it('manages custom agents lifecycle', async () => {
    registerAgentHandlers(mockContext);

    const saveHandler = mockHandlers.get(IPC.AGENTS_SAVE_CUSTOM) as Function;
    const listHandler = mockHandlers.get(IPC.AGENTS_LIST_CUSTOM) as Function;
    const deleteHandler = mockHandlers.get(IPC.AGENTS_DELETE_CUSTOM) as Function;

    // Save
    const content = '{ "id": "custom-1" }';
    await saveHandler(undefined, content, 'custom-1.json');
    expect(saveCustomAgent).toHaveBeenCalledWith(content, 'custom-1.json');

    // List
    const customs = await listHandler();
    expect(listCustomAgentDefinitions).toHaveBeenCalled();

    // Delete
    await deleteHandler(undefined, 'custom-1.json');
    expect(deleteCustomAgent).toHaveBeenCalledWith('custom-1.json');
  });
});
