import { describe, expect, it, vi } from 'vitest';
import type { ComponentHandleRegistry } from '@nop-chaos/flux-core';
import { createNopDebugger } from './controller.js';
import { MAX_PATCH_AUDIT_ENTRIES } from './schema-patch.js';
import type { NopSchemaPatch, NopSchemaPatchApplier } from './types.js';

function fakeRegistry(items: Array<{ cid: number; nodeId: string; path: string }>) {
  return {
    getDebugSnapshot: () => ({
      handles: items.map((item) => ({ cid: item.cid, mounted: true, type: 'input-text' })),
    }),
    getHandleDebugData: (cid: number) => {
      const item = items.find((entry) => entry.cid === cid);
      return item
        ? { nodeId: item.nodeId, path: item.path, rendererType: 'input-text' }
        : undefined;
    },
  } as unknown as ComponentHandleRegistry;
}

function makePatch(controllerId: string): NopSchemaPatch {
  return {
    id: 'patch-ctl-1',
    createdAt: 1_700_000_000_000,
    scope: { controllerId, target: { nodeId: 'node_42' } },
    ops: [{ type: 'set-prop', field: 'label', value: 'Patched' }],
  };
}

function setup() {
  const controller = createNopDebugger({ id: 'patch-ctl', enabled: false });
  controller.setComponentRegistry(
    fakeRegistry([{ cid: 42, nodeId: 'node_42', path: '/page/form/name' }]),
  );
  return controller;
}

describe('controller schema patch seam (apply/revert/audit)', () => {
  it('rejects apply with no applier registered (fail-closed, audited)', async () => {
    const controller = setup();
    await expect(controller.applySchemaPatch(makePatch('patch-ctl'))).rejects.toThrow(/no applier/);
    const audit = controller.getSchemaPatchAudit();
    expect(audit.some((entry) => entry.action === 'reject' && entry.detail === 'no applier')).toBe(true);
  });

  it('happy path: apply registers active patch; revert consumes it', async () => {
    const controller = setup();
    const revert = vi.fn(async () => {});
    const applier: NopSchemaPatchApplier = {
      apply: vi.fn(async () => ({ revertToken: 'tok-1' })),
      revert,
    };
    const dispose = controller.registerSchemaPatchApplier(applier);

    await controller.applySchemaPatch(makePatch('patch-ctl'));
    expect(applier.apply).toHaveBeenCalledTimes(1);

    await controller.revertSchemaPatch('patch-ctl-1');
    expect(revert).toHaveBeenCalledWith('tok-1');

    const audit = controller.getSchemaPatchAudit();
    expect(audit.some((entry) => entry.action === 'apply' && entry.ok)).toBe(true);
    expect(audit.some((entry) => entry.action === 'revert' && entry.ok)).toBe(true);

    // Active table consumed: a second revert is rejected.
    await expect(controller.revertSchemaPatch('patch-ctl-1')).rejects.toThrow(/no active patch/);
    dispose();
  });

  it('atomicity: apply failure leaves no active patch (audit failed, revert rejected)', async () => {
    const controller = setup();
    controller.registerSchemaPatchApplier({
      apply: vi.fn(async () => {
        throw new Error('host render failed');
      }),
      revert: vi.fn(async () => {}),
    });
    await expect(controller.applySchemaPatch(makePatch('patch-ctl'))).rejects.toThrow(/host render failed/);
    await expect(controller.revertSchemaPatch('patch-ctl-1')).rejects.toThrow(/no active patch/);
    const audit = controller.getSchemaPatchAudit();
    const applyEntry = audit.find((entry) => entry.action === 'apply');
    expect(applyEntry?.ok).toBe(false);
  });

  it('validation failure is rejected before the applier is consulted', async () => {
    const controller = setup();
    const applier: NopSchemaPatchApplier = {
      apply: vi.fn(async () => ({ revertToken: 'tok' })),
      revert: vi.fn(async () => {}),
    };
    controller.registerSchemaPatchApplier(applier);
    const crossController = makePatch('other-controller');
    await expect(controller.applySchemaPatch(crossController)).rejects.toThrow(/cross-controller/);
    expect(applier.apply).not.toHaveBeenCalled();
    expect(controller.getSchemaPatchAudit().some((entry) => entry.action === 'reject')).toBe(true);
  });

  it('duplicate applier registration throws', () => {
    const controller = setup();
    const applier: NopSchemaPatchApplier = {
      apply: async () => ({ revertToken: 't' }),
      revert: async () => {},
    };
    const dispose = controller.registerSchemaPatchApplier(applier);
    expect(() => controller.registerSchemaPatchApplier(applier)).toThrow(/already registered/);
    dispose();
  });

  it('validateSchemaPatch resolves live-tree targets and audits the call', () => {
    const controller = setup();
    const result = controller.validateSchemaPatch(makePatch('patch-ctl'));
    expect(result.ok).toBe(true);
    expect(result.resolvedTarget).toMatchObject({ cid: 42, nodeId: 'node_42' });
    expect(controller.getSchemaPatchAudit().some((entry) => entry.action === 'validate' && entry.ok)).toBe(true);
  });

  it('audit ring stays bounded at the cap (drop-oldest)', () => {
    const controller = setup();
    for (let i = 0; i < MAX_PATCH_AUDIT_ENTRIES + 10; i += 1) {
      controller.validateSchemaPatch(makePatch('patch-ctl'));
    }
    expect(controller.getSchemaPatchAudit().length).toBe(MAX_PATCH_AUDIT_ENTRIES);
  });

  it('dispose removes the applier; apply then fails closed again', async () => {
    const controller = setup();
    const dispose = controller.registerSchemaPatchApplier({
      apply: async () => ({ revertToken: 't' }),
      revert: async () => {},
    });
    dispose();
    await expect(controller.applySchemaPatch(makePatch('patch-ctl'))).rejects.toThrow(/no applier/);
  });
});
