import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentHandleRegistry } from '@nop-chaos/flux-core';
import { useCrudPolling } from '../use-crud-polling.js';
import type { CrudPollingConfig } from '../crud-schema.js';

const RETRY_MS = 250;
const MAX_ATTEMPTS = 20;

function makeRegistry(options: { withSource: boolean }) {
  const startSpy = vi.fn();
  const cancelSpy = vi.fn();
  const registry = {
    resolve: vi.fn(() => undefined),
    getDebugSnapshot: vi.fn(() => ({
      handles: options.withSource
        ? [
            {
              id: 'ds1',
              type: 'data-source',
              capabilities: {
                hasMethod: (method: string) => method === 'start' || method === 'cancel',
                invoke: (method: string) => (method === 'start' ? startSpy() : cancelSpy()),
              },
            },
          ]
        : [],
    })),
  } as unknown as ComponentHandleRegistry;
  return { registry, startSpy, cancelSpy };
}

describe('crud polling resolve retry cap (R3-P30)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('gives up after 20 retries (~5s) and warns with a config pointer', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { registry, startSpy } = makeRegistry({ withSource: false });

    renderHook(() =>
      useCrudPolling({
        polling: { enabled: true, sourceId: 'ds1' } as CrudPollingConfig,
        componentRegistry: registry,
        scope: undefined,
      }),
    );

    await vi.advanceTimersByTimeAsync(RETRY_MS * MAX_ATTEMPTS);
    expect(startSpy).not.toHaveBeenCalled();
    const capWarns = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes('stopping auto-retry'),
    );
    expect(capWarns).toHaveLength(1);
    expect(String(capWarns[0]![0])).toContain('20 retries');

    // Past the cap the hook is idle: no further retries, no further warns.
    await vi.advanceTimersByTimeAsync(RETRY_MS * 10);
    expect(warnSpy.mock.calls.filter((call) => String(call[0]).includes('stopping auto-retry'))).toHaveLength(1);
  });

  it('starts immediately once the data-source registers, and re-arms on effect re-run', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const empty = makeRegistry({ withSource: false });
    const populated = makeRegistry({ withSource: true });

    const { rerender } = renderHook(
      ({ registry }: { registry: ComponentHandleRegistry }) =>
        useCrudPolling({
          polling: { enabled: true, sourceId: 'ds1' } as CrudPollingConfig,
          componentRegistry: registry,
          scope: undefined,
        }),
      { initialProps: { registry: empty.registry } },
    );

    // Burn the whole retry window against the missing source.
    await vi.advanceTimersByTimeAsync(RETRY_MS * MAX_ATTEMPTS + RETRY_MS * 5);
    expect(empty.startSpy).not.toHaveBeenCalled();

    // Effect re-run (registry change) re-arms the attempt counter; the resolved
    // attempt runs synchronously inside the effect.
    rerender({ registry: populated.registry });
    expect(populated.startSpy).toHaveBeenCalledTimes(1);
  });
});
