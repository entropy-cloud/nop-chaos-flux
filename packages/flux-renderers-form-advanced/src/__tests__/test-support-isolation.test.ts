import { describe, expect, it } from 'vitest';
import {
  formStateProbeRenderCounts,
  formTestHarness,
  handlerIdentitySnapshots,
  notifyCalls,
  submitCalls,
} from '../test-support.js';

describe('advanced form test support isolation', () => {
  it('keeps exported harness bindings isolated across resets', () => {
    submitCalls.push({ first: true });
    notifyCalls.push({ level: 'info', message: 'before reset' });
    formStateProbeRenderCounts.alpha = 1;
    handlerIdentitySnapshots.push({ onBlur: () => undefined } as never);

    formTestHarness.reset();

    expect(submitCalls).toHaveLength(0);
    expect(notifyCalls).toHaveLength(0);
    expect(Object.keys(formStateProbeRenderCounts)).toEqual([]);
    expect(handlerIdentitySnapshots).toHaveLength(0);

    submitCalls.push({ second: true });

    expect(submitCalls).toEqual([{ second: true }]);
  });
});
