import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock agentLoaderService before importing registry
vi.mock('../agentLoaderService.js', () => ({
  loadCustomAgents: vi.fn(() => []),
}));

import {
  listAgentDefinitions,
  getAgentDefinition,
  listCustomAgentDefinitions,
} from '../registry.js';
import { loadCustomAgents } from '../agentLoaderService.js';
import type { AgentDefinition } from '../../types/agent.js';

describe('Agent Registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── listAgentDefinitions() ───

  it('listAgentDefinitions() returns preset agents', () => {
    const agents = listAgentDefinitions();

    expect(agents).toHaveLength(2);
    expect(agents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'transport-review-workflow',
          title: 'Transport 리뷰 Workflow',
        }),
        expect.objectContaining({
          id: 'incident-resolution-workflow',
          title: 'Incident 해결 Workflow',
        }),
      ])
    );
  });

  it('listAgentDefinitions() returns agents with all required fields', () => {
    const agents = listAgentDefinitions();

    agents.forEach((agent) => {
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('title');
      expect(agent).toHaveProperty('description');
      expect(agent).toHaveProperty('category');
      expect(agent).toHaveProperty('estimatedDuration');
      expect(agent).toHaveProperty('steps');
      expect(Array.isArray(agent.steps)).toBe(true);
      expect(agent.steps.length).toBeGreaterThan(0);
    });
  });

  it('listAgentDefinitions() returns deep copies — modifying returned object does not affect original', () => {
    const agents1 = listAgentDefinitions();
    const originalConfig = { ...agents1[0].steps[0].config };

    // Modify returned object
    agents1[0].steps[0].config.modified = true;

    // Get new list
    const agents2 = listAgentDefinitions();

    // Original should not be modified
    expect(agents2[0].steps[0].config).toEqual(originalConfig);
    expect(agents2[0].steps[0].config).not.toHaveProperty('modified');
  });

  it('listAgentDefinitions() clones step dependencies', () => {
    const agents1 = listAgentDefinitions();
    const stepWithDeps = agents1[0].steps.find((s) => s.dependsOn?.length);

    if (stepWithDeps?.dependsOn) {
      const originalDeps = [...stepWithDeps.dependsOn];
      stepWithDeps.dependsOn.push('extra-dependency');

      const agents2 = listAgentDefinitions();
      const newStep = agents2[0].steps.find((s) => s.id === stepWithDeps.id);

      expect(newStep?.dependsOn).toEqual(originalDeps);
    }
  });

  // ─── getAgentDefinition() ───

  it('getAgentDefinition() returns agent by ID', () => {
    const agent = getAgentDefinition('transport-review-workflow');

    expect(agent).not.toBeNull();
    expect(agent?.id).toBe('transport-review-workflow');
    expect(agent?.title).toBe('Transport 리뷰 Workflow');
  });

  it('getAgentDefinition() returns null for unknown ID', () => {
    const agent = getAgentDefinition('nonexistent-agent');

    expect(agent).toBeNull();
  });

  it('getAgentDefinition() returns deep copy', () => {
    const agent1 = getAgentDefinition('incident-resolution-workflow');
    if (!agent1) throw new Error('Agent not found');

    // Modify returned object
    agent1.steps[0].config.modified = true;

    // Get again
    const agent2 = getAgentDefinition('incident-resolution-workflow');

    // Should not be modified
    expect(agent2?.steps[0].config).not.toHaveProperty('modified');
  });

  it('getAgentDefinition() returns steps with cloned config and dependsOn', () => {
    const agent1 = getAgentDefinition('incident-resolution-workflow');
    if (!agent1) throw new Error('Agent not found');

    const step = agent1.steps[1];
    if (step.dependsOn) {
      step.dependsOn.push('extra');
    }

    const agent2 = getAgentDefinition('incident-resolution-workflow');
    const newStep = agent2?.steps[1];

    expect(newStep?.dependsOn).not.toContain('extra');
  });

  // ─── listCustomAgentDefinitions() ───

  it('listCustomAgentDefinitions() returns empty array when no custom agents', () => {
    const customs = listCustomAgentDefinitions();

    expect(customs).toEqual([]);
  });

  it('listCustomAgentDefinitions() returns custom agents from loader', () => {
    const customAgent: AgentDefinition = {
      id: 'custom-agent-1',
      title: 'Custom Agent',
      description: 'A custom agent',
      category: 'analysis',
      estimatedDuration: 60,
      steps: [
        {
          id: 'step1',
          skillId: 'skill1',
          label: 'Step 1',
          sortOrder: 1,
          config: {},
        },
      ],
    };

    vi.mocked(loadCustomAgents).mockReturnValue([customAgent]);

    const customs = listCustomAgentDefinitions();

    expect(customs).toHaveLength(1);
    expect(customs[0].id).toBe('custom-agent-1');
  });

  it('listCustomAgentDefinitions() returns deep copies of custom agents', () => {
    const customAgent: AgentDefinition = {
      id: 'custom-agent-2',
      title: 'Custom Agent 2',
      description: 'A second custom agent',
      category: 'automation',
      estimatedDuration: 120,
      steps: [
        {
          id: 'step1',
          skillId: 'skill1',
          label: 'Step 1',
          sortOrder: 1,
          config: { key: 'value' },
          dependsOn: ['previous'],
        },
      ],
    };

    vi.mocked(loadCustomAgents).mockReturnValue([customAgent]);

    const customs1 = listCustomAgentDefinitions();
    customs1[0].steps[0].config.key = 'modified';

    const customs2 = listCustomAgentDefinitions();
    expect(customs2[0].steps[0].config.key).toBe('value');
  });

  // ─── Deduplication ───

  it('lists preset agents only when custom agents have duplicate IDs (preset wins)', () => {
    const customAgent: AgentDefinition = {
      id: 'transport-review-workflow', // Same ID as preset
      title: 'Custom Transport Workflow',
      description: 'Custom version',
      category: 'documentation',
      estimatedDuration: 180,
      steps: [
        {
          id: 'custom-step',
          skillId: 'custom-skill',
          label: 'Custom Step',
          sortOrder: 1,
          config: {},
        },
      ],
    };

    vi.mocked(loadCustomAgents).mockReturnValue([customAgent]);

    const agents = listAgentDefinitions();

    // Should have exactly 2: preset agents (custom duplicate is filtered out)
    expect(agents).toHaveLength(2);
    // The returned agent should be the preset version, not custom
    const preset = agents.find((a) => a.id === 'transport-review-workflow');
    expect(preset?.steps[0].id).toBe('analyze');
  });

  it('returns both preset and non-duplicate custom agents', () => {
    const customAgent: AgentDefinition = {
      id: 'unique-custom-agent',
      title: 'Unique Custom Agent',
      description: 'This should be included',
      category: 'validation',
      estimatedDuration: 150,
      steps: [
        {
          id: 'custom-step',
          skillId: 'custom-skill',
          label: 'Custom Step',
          sortOrder: 1,
          config: {},
        },
      ],
    };

    vi.mocked(loadCustomAgents).mockReturnValue([customAgent]);

    const agents = listAgentDefinitions();

    // Should have 3: 2 preset + 1 unique custom
    expect(agents).toHaveLength(3);
    expect(agents.map((a) => a.id)).toContain('transport-review-workflow');
    expect(agents.map((a) => a.id)).toContain('incident-resolution-workflow');
    expect(agents.map((a) => a.id)).toContain('unique-custom-agent');
  });

  it('returns custom agent by ID when not duplicate', () => {
    const customAgent: AgentDefinition = {
      id: 'custom-lookup-agent',
      title: 'Custom Lookup Agent',
      description: 'For lookup testing',
      category: 'analysis',
      estimatedDuration: 100,
      steps: [
        {
          id: 'step1',
          skillId: 'skill1',
          label: 'Step 1',
          sortOrder: 1,
          config: {},
        },
      ],
    };

    vi.mocked(loadCustomAgents).mockReturnValue([customAgent]);

    const agent = getAgentDefinition('custom-lookup-agent');

    expect(agent).not.toBeNull();
    expect(agent?.id).toBe('custom-lookup-agent');
    expect(agent?.title).toBe('Custom Lookup Agent');
  });
});
