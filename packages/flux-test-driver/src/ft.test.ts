import { describe, expect, it } from 'vitest';
import { buildFtGlobal, requireKernel } from './ft.js';
import type { DebuggerApiView } from './types.js';

function makeApi(overrides: Partial<DebuggerApiView> = {}): DebuggerApiView {
  return {
    controllerId: 'c-9',
    sessionId: 's-9',
    getSnapshot: () => ({ scopes: { orderForm: { total: 9900 } } }),
    getStability: () => ({ stable: true, counters: {} }),
    dispatch: async () => 'dispatched',
    getSnapshotAt: (epoch: number) => ({ epoch }),
    getSnapshotEpochs: () => [1, 2, 3],
    screenshot: async () => ({ contentHash: 'abc' }),
    ...overrides,
  } as DebuggerApiView;
}

describe('requireKernel', () => {
  it('throws kernel-not-attached without api', () => {
    expect(() => requireKernel(undefined)).toThrow(/kernel-not-attached/);
  });
});

describe('buildFtGlobal', () => {
  it('kernel block reflects attachment state', () => {
    const attached = buildFtGlobal(() => makeApi());
    expect(attached.kernel).toMatchObject({ attached: true, controllerId: 'c-9', sessionId: 's-9' });
    const detached = buildFtGlobal(() => undefined);
    expect(detached.kernel.attached).toBe(false);
  });

  it('byCid resolves numeric cid via inspectByCid', () => {
    const ft = buildFtGlobal(() => makeApi({ inspectByCid: (cid: number) => ({ cid, mounted: true }) }));
    expect(ft.byCid(7)).toMatchObject({ cid: 7 });
  });

  it('byCid resolves testid via element inspection', () => {
    const element = { tagName: 'BUTTON' } as Element;
    const inspected = { cid: 3, mounted: true };
    const ft = buildFtGlobal(() =>
      makeApi({
        inspectByElement: (el: Element) => (el === element ? inspected : undefined),
      }),
    );
    const originalDocument = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = {
      querySelector: (selector: string) => (selector.includes('submit') ? element : null),
    };
    try {
      expect(ft.byCid('submit-btn')).toEqual(inspected);
    } finally {
      (globalThis as { document?: unknown }).document = originalDocument;
    }
  });

  it('waitFor delegates to kernel waitFor predicate', async () => {
    const ft = buildFtGlobal(() => makeApi({ waitFor: async () => ({ ok: true, attempts: 2, durationMs: 5 }) }));
    const result = await ft.waitFor({ type: 'stability' }, { timeoutMs: 100 });
    expect(result).toMatchObject({ ok: true, attempts: 2 });
  });

  it('waitFor reports failure when kernel lacks waitFor', async () => {
    const ft = buildFtGlobal(() => makeApi());
    const result = await ft.waitFor({ type: 'stability' });
    expect(result.ok).toBe(false);
    expect(result.lastError).toContain('not wired');
  });

  it('scope reads nested snapshot path', () => {
    const ft = buildFtGlobal(() => makeApi());
    expect(ft.scope('orderForm.total')).toBe(9900);
    expect(() => ft.scope('nope.nothing')).toThrow(/kernel-not-attached|not found/);
  });

  it('snapshotAt delegates to collector', () => {
    const ft = buildFtGlobal(() => makeApi());
    expect(ft.snapshotAt(2)).toEqual({ epoch: 2 });
  });

  it('screenshot delegates to capture channel', async () => {
    const ft = buildFtGlobal(() => makeApi());
    const result = (await ft.screenshot()) as { contentHash: string };
    expect(result.contentHash).toBe('abc');
  });

  it('screenshot without capture channel throws', async () => {
    const ft = buildFtGlobal(() => makeApi({ screenshot: undefined }));
    await expect(ft.screenshot()).rejects.toThrow(/not wired/);
  });

  it('evaluate runs the expression', async () => {
    const ft = buildFtGlobal(() => undefined);
    expect(await ft.evaluate('1 + 1')).toBe(2);
  });
});
