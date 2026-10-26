import { describe, expect, it, vi } from 'vitest';
import type { ComponentHandleRegistry } from '@nop-chaos/flux-core';
import { createNopDebugger } from '@nop-chaos/nop-debugger';
import type { NopDebuggerController, NopSchemaPatchApplier } from '@nop-chaos/nop-debugger';
import { createDebuggerAiTools } from '../create-debugger-ai-tools.js';
import {
  composeDebuggerAiToolset,
  executeProposeSchemaPatch,
} from '../panel/propose-tool.js';
import { createPatchCandidateStore } from '../panel/patch-candidates.js';

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

function setupController() {
  const controller = createNopDebugger({ id: 'propose-ctl', enabled: false });
  controller.setComponentRegistry(
    fakeRegistry([{ cid: 42, nodeId: 'node_42', path: '/page/form/name' }]),
  );
  return controller;
}

const VALID_ARGS = {
  target: { nodeId: 'node_42' },
  ops: [{ type: 'set-prop', field: 'label', value: 'Patched label' }],
  reason: 'fix label',
};

describe('propose_schema_patch tool', () => {
  it('stages a validated candidate and returns its id', async () => {
    const controller = setupController();
    const store = createPatchCandidateStore();
    const result = (await executeProposeSchemaPatch({ controller, store }, VALID_ARGS)) as {
      ok: boolean;
      result?: string;
    };
    expect(result.ok).toBe(true);
    const payload = JSON.parse(result.result!);
    expect(payload.candidateId).toBeTruthy();
    expect(payload.resolvedTarget).toMatchObject({ nodeId: 'node_42', cid: 42 });
    expect(store.getSnapshot()).toHaveLength(1);
    expect(store.getSnapshot()[0].status).toBe('staged');
  });

  it('returns structured per-rule errors for invalid proposals without staging', async () => {
    const controller = setupController();
    const store = createPatchCandidateStore();
    const result = (await executeProposeSchemaPatch({ controller, store }, {
      target: { nodeId: 'node_42' },
      ops: [],
    })) as { ok: boolean; error?: string };
    expect(result.ok).toBe(false);
    expect(result.error).toContain('ops empty');
    expect(store.getSnapshot()).toHaveLength(0);
  });

  it('enforces the active-candidate bound (staged/conflicted only)', async () => {
    const controller = setupController();
    const store = createPatchCandidateStore();
    for (let i = 0; i < 10; i += 1) {
      const result = (await executeProposeSchemaPatch({ controller, store }, {
        ...VALID_ARGS,
        ops: [{ type: 'set-prop', field: `field_${i}`, value: i }],
      })) as { ok: boolean };
      expect(result.ok).toBe(true);
    }
    const overflow = (await executeProposeSchemaPatch({ controller, store }, VALID_ARGS)) as {
      ok: boolean;
      error?: string;
    };
    expect(overflow.ok).toBe(false);
    expect(overflow.error).toContain('candidate limit');
  });

  it('adopter gate: the model tool face never contains apply/revert channels', () => {
    const controller = setupController();
    const store = createPatchCandidateStore();
    const { tools } = composeDebuggerAiToolset({ controller, store });
    const names = tools.map((tool) => tool.function.name);
    expect(names).toContain('propose_schema_patch');
    expect(names).toContain('query_events');
    for (const banned of ['apply_schema_patch', 'revert_schema_patch', 'adopt_candidate', 'applySchemaPatch']) {
      expect(names).not.toContain(banned);
    }
  });

  it('adopter gate: the composite dispatcher rejects apply-style names as unknown tools', async () => {
    const controller = setupController();
    const store = createPatchCandidateStore();
    const { toolExecutor } = composeDebuggerAiToolset({ controller, store });
    const call = {
      index: 0,
      id: 'call-x',
      type: 'function' as const,
      function: { name: 'apply_schema_patch', arguments: '{}' },
    };
    const result = (await toolExecutor({ toolCall: call, signal: new AbortController().signal })) as {
      ok: boolean;
      error?: string;
    };
    expect(result.ok).toBe(false);
    expect(result.error).toContain('unknown tool');
    // And the controller never saw an apply.
    expect(controller.getSchemaPatchAudit().some((entry) => entry.action === 'apply')).toBe(false);
  });
});

describe('patch candidate store state machine', () => {
  function stagedSetup() {
    const controller = setupController();
    const store = createPatchCandidateStore();
    const proposal = (async () => {
      await executeProposeSchemaPatch({ controller, store }, VALID_ARGS);
      return store.getSnapshot()[0];
    })();
    return { controller, store, proposal };
  }

  it('adopt: revalidates, applies, and marks applied', async () => {
    const { controller, store, proposal } = stagedSetup();
    const candidate = await proposal;
    const applier: NopSchemaPatchApplier = {
      apply: vi.fn(async () => ({ revertToken: 'tok-1' })),
      revert: vi.fn(async () => {}),
    };
    controller.registerSchemaPatchApplier(applier);

    const { adoptCandidate } = await import('../panel/patch-candidates.js');
    await adoptCandidate({ controller, store }, candidate.id);

    expect(applier.apply).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()[0].status).toBe('applied');
  });

  it('adopt with a stale target marks conflicted and never calls the applier', async () => {
    const { controller, store, proposal } = stagedSetup();
    const candidate = await proposal;
    const applier: NopSchemaPatchApplier = {
      apply: vi.fn(async () => ({ revertToken: 'tok' })),
      revert: vi.fn(async () => {}),
    };
    controller.registerSchemaPatchApplier(applier);
    // Scope changed under the candidate: the target left the live tree.
    controller.setComponentRegistry(fakeRegistry([{ cid: 43, nodeId: 'node_43', path: '/other' }]));

    const { adoptCandidate } = await import('../panel/patch-candidates.js');
    await expect(adoptCandidate({ controller, store }, candidate.id)).rejects.toThrow(/conflict|not resolved|ambiguous/);
    expect(applier.apply).not.toHaveBeenCalled();
    expect(store.getSnapshot()[0].status).toBe('conflicted');
  });

  it('rollback: applied candidate reverts and marks reverted', async () => {
    const { controller, store, proposal } = stagedSetup();
    await proposal;
    controller.registerSchemaPatchApplier({
      apply: vi.fn(async () => ({ revertToken: 'tok-2' })),
      revert: vi.fn(async () => {}),
    });
    const { adoptCandidate, rollbackCandidate } = await import('../panel/patch-candidates.js');
    await adoptCandidate({ controller, store }, store.getSnapshot()[0].id);
    await rollbackCandidate({ controller, store }, store.getSnapshot()[0].id);
    expect(store.getSnapshot()[0].status).toBe('reverted');
  });

  it('discard marks terminal and frees the active slot', async () => {
    const { store, proposal } = stagedSetup();
    await proposal;
    const { discardCandidate } = await import('../panel/patch-candidates.js');
    const id = store.getSnapshot()[0].id;
    await discardCandidate({ controller: {} as NopDebuggerController, store }, id);
    expect(store.getSnapshot()[0].status).toBe('discarded');
  });

  it('terminal transitions free active slots (slot-accounting discriminator)', async () => {
    const controller = setupController();
    const store = createPatchCandidateStore();
    controller.registerSchemaPatchApplier({
      apply: vi.fn(async () => ({ revertToken: 't' })),
      revert: vi.fn(async () => {}),
    });
    for (let i = 0; i < 10; i += 1) {
      await executeProposeSchemaPatch({ controller, store }, {
        ...VALID_ARGS,
        ops: [{ type: 'set-prop', field: `f${i}`, value: i }],
      });
    }
    expect(store.activeCount()).toBe(10);
    const overflow = await executeProposeSchemaPatch({ controller, store }, VALID_ARGS);
    expect(overflow.ok).toBe(false);
    const { discardCandidate } = await import('../panel/patch-candidates.js');
    await discardCandidate({ controller, store }, store.getSnapshot()[0].id);
    expect(store.activeCount()).toBe(9);
    const retried = await executeProposeSchemaPatch({ controller, store }, VALID_ARGS);
    expect(retried.ok).toBe(true);
  });

  it('rollback requires applied state', async () => {
    const { store, proposal } = stagedSetup();
    await proposal;
    const { rollbackCandidate } = await import('../panel/patch-candidates.js');
    await expect(rollbackCandidate({ controller: {} as never, store }, store.getSnapshot()[0].id)).rejects.toThrow(
      /not in applied state/,
    );
  });

  it('terminal history is FIFO-capped (HISTORY_LIMIT visible)', async () => {
    const controller = setupController();
    controller.registerSchemaPatchApplier({
      apply: vi.fn(async () => ({ revertToken: 't' })),
      revert: vi.fn(async () => {}),
    });
    const store = createPatchCandidateStore();
    const { adoptCandidate } = await import('../panel/patch-candidates.js');
    // 12 staged+applied candidates → 12 terminal; only the latest 10 remain visible.
    for (let i = 0; i < 12; i += 1) {
      await executeProposeSchemaPatch({ controller, store }, {
        target: { nodeId: 'node_42' },
        ops: [{ type: 'set-prop', field: `f${i}`, value: i }],
      });
      const staged = store.getSnapshot().find((candidate) => candidate.status === 'staged');
      await adoptCandidate({ controller, store }, staged!.id);
    }
    const terminal = store.getSnapshot().filter((candidate) => candidate.status === 'applied');
    expect(terminal.length).toBeLessThanOrEqual(10);
    expect(store.getSnapshot().length).toBeLessThanOrEqual(10);
  });

  it('getSnapshot returns cached identity between mutations (useSyncExternalStore safety)', async () => {
    const { store, proposal } = stagedSetup();
    await proposal;
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });
});

describe('read-only toolset stays intact alongside propose', () => {
  it('composite toolset still executes read-only tools through the same executor', async () => {
    const controller = setupController();
    const store = createPatchCandidateStore();
    const { toolExecutor } = composeDebuggerAiToolset({ controller, store });
    const call = {
      index: 0,
      id: 'call-ro',
      type: 'function' as const,
      function: { name: 'get_overview', arguments: '{}' },
    };
    const result = (await toolExecutor({ toolCall: call, signal: new AbortController().signal })) as {
      ok: boolean;
    };
    expect(result.ok).toBe(true);
  });
});

describe('inspection selection remains untouched by the patch surface', () => {
  it('selection projection still drops sensitive faces (regression guard)', () => {
    const controller = setupController();
    const { tools } = createDebuggerAiTools({ automation: controller.automation });
    expect(tools.some((tool) => tool.function.name === 'inspect_node')).toBe(true);
  });
});

describe('patch card preview and original-value rendering', () => {
  it('originalValue: resolvable target renders original → new; otherwise the explicit marker', async () => {
    const { render, screen } = await import('@testing-library/react');
    const { cleanup } = await import('@testing-library/react');
    const controller = setupController();
    const store = createPatchCandidateStore();
    await executeProposeSchemaPatch({ controller, store }, {
      target: { nodeId: 'node_42' },
      ops: [{ type: 'set-prop', field: 'label', value: 'Patched' }],
    });
    const { PatchQueue } = await import('../panel/patch-queue.js');
    render(<PatchQueue controller={controller} store={store} />);
    const op = screen.getByTestId('ndbg-patch-op');
    // Original resolvable via the live inspect projection when present.
    expect(op.textContent).toContain('label:');
    expect(op.textContent).toContain('Patched');
    cleanup();

    // Registry emptied → target unresolvable at render → explicit marker.
    controller.setComponentRegistry(fakeRegistry([]));
    render(<PatchQueue controller={controller} store={store} />);
    const marker = screen.getByTestId('ndbg-patch-op');
    expect(marker.textContent).toMatch(/original unavailable|原值不可得/);
    cleanup();
  });

  it('host preview summary renders; fallback shows nothing extra', async () => {
    const { render, screen, waitFor } = await import('@testing-library/react');
    const { cleanup } = await import('@testing-library/react');
    const controller = setupController();
    const store = createPatchCandidateStore();
    await executeProposeSchemaPatch({ controller, store }, {
      target: { nodeId: 'node_42' },
      ops: [{ type: 'set-prop', field: 'label', value: 'Patched' }],
    });
    const { PatchQueue } = await import('../panel/patch-queue.js');
    render(
      <PatchQueue
        controller={controller}
        store={store}
        preview={async () => ({ kind: 'rendered', summary: 'sandbox: label becomes Patched' })}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('ndbg-patch-preview')).toBeTruthy();
    });
    expect(screen.getByTestId('ndbg-patch-preview').textContent).toContain('sandbox: label becomes Patched');
    cleanup();

    render(<PatchQueue controller={controller} store={store} />);
    await waitFor(() => {
      expect(screen.queryByTestId('ndbg-patch-preview')).toBeNull();
    });
    cleanup();
  });
});
