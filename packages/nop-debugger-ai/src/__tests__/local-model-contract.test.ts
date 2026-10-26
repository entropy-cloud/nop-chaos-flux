import { describe, expect, it, vi } from 'vitest';
import type { ComponentHandleRegistry } from '@nop-chaos/flux-core';
import { createNopDebugger } from '@nop-chaos/nop-debugger';
import type { NopSchemaPatchApplier } from '@nop-chaos/nop-debugger';
import { composeDebuggerAiToolset } from '../panel/propose-tool.js';
import { scriptedConnector } from './scripted-connector.js';

/**
 * Local-model probe ↔ production contract (deterministic, no network).
 *
 * The live-model probe `scripts/__tests__/ai-debugger-local-qwen.optional.test.ts`
 * declares a hand-written tool whitelist against a real local model. These
 * tests pin that declaration to the PRODUCTION tool face so drift is caught
 * in CI: the probe's seed names must stay a subset of the compose-time tool
 * list, and a probe-shaped propose tool_call must complete the offline
 * validate→stage chain through the same dispatcher the session uses.
 */

const PROBE_SEED_TOOL_NAMES = [
  'explain_node_failure',
  'get_node_diagnostics',
  'query_events',
  'propose_schema_patch',
] as const;

function fakeRegistry(items: Array<{ cid: number; nodeId: string; path: string }>) {
  return {
    getDebugSnapshot: () => ({
      handles: items.map((item) => ({ cid: item.cid, mounted: true, type: 'input-text' })),
    }),
    getHandleDebugData: (cid: number) => {
      const item = items.find((entry) => entry.cid === cid);
      return item ? { nodeId: item.nodeId, path: item.path, rendererType: 'input-text' } : undefined;
    },
  } as unknown as ComponentHandleRegistry;
}

function setup() {
  const controller = createNopDebugger({ id: 'probe-contract', enabled: false });
  controller.setComponentRegistry(
    fakeRegistry([{ cid: 42, nodeId: 'node_42', path: '/page/form/name' }]),
  );
  const toolset = composeDebuggerAiToolset({ controller });
  return { controller, toolset };
}

const PROBE_PROPOSE_ARGUMENTS = JSON.stringify({
  target: { nodeId: 'node_42' },
  ops: [{ type: 'set-prop', field: 'label', value: 'Patched by probe' }],
});

describe('local-model probe ↔ production tool contract', () => {
  it('probe seed names are all live in the production tool face', () => {
    const { toolset } = setup();
    const productionNames = toolset.tools.map((tool) => tool.function.name);
    for (const seed of PROBE_SEED_TOOL_NAMES) {
      expect(productionNames, `probe seed "${seed}" must exist in the production face`).toContain(seed);
    }
    // And the probe's propose seed is stage-only: no apply/revert tool exists.
    expect(productionNames).not.toContain('apply_schema_patch');
    expect(productionNames).not.toContain('revert_schema_patch');
  });

  it('a probe-shaped propose tool_call completes the offline validate→stage chain', async () => {
    const { controller, toolset } = setup();
    const applier: NopSchemaPatchApplier = {
      apply: vi.fn(async () => ({ revertToken: 'never-called-here' })),
      revert: vi.fn(async () => {}),
    };
    controller.registerSchemaPatchApplier(applier);

    // Same wire shape the probe asserts from the real model: tool_calls array,
    // function.name, JSON-string arguments.
    const toolCall = {
      index: 0,
      id: 'call-probe',
      type: 'function' as const,
      function: { name: 'propose_schema_patch', arguments: PROBE_PROPOSE_ARGUMENTS },
    };
    const result = (await toolset.toolExecutor({
      toolCall,
      signal: new AbortController().signal,
    })) as { ok: boolean; result?: string };

    expect(result.ok).toBe(true);
    const payload = JSON.parse(result.result!);
    expect(payload.candidateId).toBeTruthy();
    expect(payload.note).toContain('NOT applied');
    // Staged only — the host applier must never fire from a model proposal.
    expect(applier.apply).not.toHaveBeenCalled();
    expect(toolset.store.getSnapshot()).toHaveLength(1);
  });

  it('unparseable model arguments return a structured error through the same dispatcher', async () => {
    const { toolset } = setup();
    const result = (await toolset.toolExecutor({
      toolCall: {
        index: 0,
        id: 'call-bad',
        type: 'function' as const,
        function: { name: 'propose_schema_patch', arguments: '{not json from a model' },
      },
      signal: new AbortController().signal,
    })) as { ok: boolean; error?: string };
    expect(result.ok).toBe(false);
    expect(result.error).toContain('invalid arguments');
  });

  it('the full engine loop consumes a scripted probe turn offline (no network)', async () => {
    const { toolset } = setup();
    const engine = (await import('@nop-chaos/flux-renderers-ai')).createMessageEngine({
      adapter: (await import('@nop-chaos/flux-renderers-ai')).createReactMessageAdapter(),
      connector: scriptedConnector([
        [
          {
            delta: {
              role: 'assistant',
              tool_calls: [
                {
                  index: 0,
                  id: 'call-probe-loop',
                  type: 'function',
                  function: { name: 'propose_schema_patch', arguments: PROBE_PROPOSE_ARGUMENTS },
                },
              ],
            },
          },
          { finishReason: 'tool_calls' },
        ],
        [
          { delta: { role: 'assistant', content: 'staged' } },
          { finishReason: 'stop' },
        ],
      ]),
      tools: toolset.tools,
      toolExecutor: toolset.toolExecutor,
    });
    await engine.sendMessage('fix the label');
    expect(toolset.store.getSnapshot()).toHaveLength(1);
    expect(engine.getMessages().some((message) => message.content === 'staged')).toBe(true);
  });
});
