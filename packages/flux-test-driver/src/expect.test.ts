import { describe, expect, it } from 'vitest';
import { createExpect } from './expect.js';
import type { AssertCheck, DebuggerApiView } from './types.js';

function makeApi(overrides: Partial<DebuggerApiView> = {}): DebuggerApiView {
  return {
    controllerId: 'c-1',
    sessionId: 's-1',
    getSnapshot: () => ({ scopes: { orderForm: { total: 9900, items: [1, 2] } } }),
    inspectByCid: (cid: number) =>
      cid === 7
        ? {
            cid: 7,
            mounted: true,
            metaSummary: { disabled: false, visible: true },
            propsSummary: { label: '提交订单' },
          }
        : undefined,
    inspectByElement: () => ({ cid: 7, mounted: true, metaSummary: { disabled: false }, propsSummary: {} }),
    queryEvents: (query?: { kind?: string }) =>
      (query?.kind === 'ajax:order/submit' ? [{ seq: 1, kind: 'ajax:order/submit', timestamp: Date.now(), summary: 'submit', status: 'passed' }] : []),
    getSnapshotAt: (epoch: number) => (epoch === 3 ? { scopes: { orderForm: { items: [1, 2] } } } : { scopes: {} }),
    ...overrides,
  } as DebuggerApiView;
}

function collect(): { checks: AssertCheck[]; ftExpect: ExpectApiShim } {
  const checks: AssertCheck[] = [];
  const expectApi = createExpect(() => makeApi(), (c) => checks.push(c));
  return { checks, ftExpect: expectApi as unknown as ExpectApiShim };
}

type ExpectApiShim = ReturnType<typeof createExpect>;

describe('ft.expect.cid', () => {
  it('meta passes when all entries match', async () => {
    const { ftExpect, checks } = collect();
    const result = await ftExpect.cid('7').meta({ disabled: false });
    expect(result.passed).toBe(true);
    expect(checks).toHaveLength(1);
  });

  it('meta fails with mismatch keys and records actual', async () => {
    const { ftExpect } = collect();
    const result = await ftExpect.cid('7').meta({ disabled: true });
    expect(result.passed).toBe(false);
    expect(result.because).toContain('disabled');
  });

  it('prop passes/fails on evaluated prop value', async () => {
    const { ftExpect } = collect();
    expect((await ftExpect.cid('7').prop('label', '提交订单')).passed).toBe(true);
    expect((await ftExpect.cid('7').prop('label', 'x')).passed).toBe(false);
  });

  it('rendered and not.rendered read mount state', async () => {
    const { ftExpect } = collect();
    expect((await ftExpect.cid('7').rendered()).passed).toBe(true);
    expect((await ftExpect.cid('7').not.rendered({ because: 'region-inactive' })).passed).toBe(false);
  });

  it('rendered reports because on failure', async () => {
    const { ftExpect } = collect();
    const result = await ftExpect.cid('7').not.rendered({ because: 'region-inactive' });
    expect(result.passed).toBe(false);
    expect(result.because).toContain('mounted');
  });

  it('unknown cid yields failed rendered check, not throw', async () => {
    const { ftExpect } = collect();
    const result = await ftExpect.cid('999').rendered();
    expect(result.passed).toBe(false);
  });
});

describe('ft.expect.scope', () => {
  it('toEqual matches nested scope path value', async () => {
    const { ftExpect } = collect();
    const result = await ftExpect.scope('orderForm.total').toEqual(9900);
    expect(result.passed).toBe(true);
  });

  it('toEqual fails when value differs', async () => {
    const { ftExpect } = collect();
    const result = await ftExpect.scope('orderForm.total').toEqual(1);
    expect(result.passed).toBe(false);
    expect(result.actual).toBe(9900);
    expect(result.expected).toBe(1);
  });

  it('toEqual reports missing path via because', async () => {
    const { ftExpect } = collect();
    const result = await ftExpect.scope('missing.path').toEqual(1);
    expect(result.passed).toBe(false);
    expect(result.because).toContain('not found');
  });
});

describe('ft.expect.event', () => {
  it('ended matches a recorded event', async () => {
    const { ftExpect } = collect();
    const result = await ftExpect.event('ajax:order/submit').ended({ status: 'passed' });
    expect(result.passed).toBe(true);
  });

  it('ended fails on absent event', async () => {
    const { ftExpect } = collect();
    const result = await ftExpect.event('ajax:never').ended();
    expect(result.passed).toBe(false);
    expect(result.because).toContain('no ajax:never event');
  });
});

describe('ft.expect.snapshotPath', () => {
  it('writtenAtStep passes when path present at epoch', async () => {
    const { ftExpect } = collect();
    const result = await ftExpect.snapshotPath('orderForm.items').writtenAtStep(3);
    expect(result.passed).toBe(true);
  });

  it('writtenAtStep fails when epoch lacks the path', async () => {
    const { ftExpect } = collect();
    const result = await ftExpect.snapshotPath('orderForm.items').writtenAtStep(1);
    expect(result.passed).toBe(false);
    expect(result.because).toContain('epoch 1');
  });
});
