import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { RuntimeContext, ScopeContext } from '../contexts';
import { isSourceSchema, useSourceValue } from '../use-source-value';

function makeScope() {
  return {
    id: 'scope-1',
    path: '$',
    value: {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    update() {},
    merge() {},
  } as any;
}

describe('useSourceValue', () => {
  it('detects source schemas', () => {
    expect(isSourceSchema({ type: 'source' })).toBe(true);
    expect(isSourceSchema({ type: 'text' })).toBe(false);
    expect(isSourceSchema(null)).toBe(false);
  });

  it('returns plain values without loading', () => {
    function Probe() {
      const state = useSourceValue<string>('ready');
      return (
        <span data-testid="value">{`${state.loading}:${state.value}:${String(state.error)}`}</span>
      );
    }

    render(
      <RuntimeContext.Provider value={{} as any}>
        <ScopeContext.Provider value={makeScope()}>
          <Probe />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    expect(screen.getByTestId('value').textContent).toBe('false:ready:undefined');
  });

  it('loads source values and surfaces errors', async () => {
    cleanup();
    const executeSource = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, data: 'resolved' })
      .mockRejectedValueOnce(new Error('boom'));

    function Probe({ source }: { source: unknown }) {
      const state = useSourceValue<string>(source);
      return (
        <span data-testid="value">{`${state.loading}:${state.value ?? 'none'}:${state.error instanceof Error ? state.error.message : 'none'}`}</span>
      );
    }

    const { rerender } = render(
      <RuntimeContext.Provider value={{ executeSource } as any}>
        <ScopeContext.Provider value={makeScope()}>
          <Probe source={{ type: 'source', sourceType: 'api' }} />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    expect(screen.getByTestId('value').textContent).toBe('true:none:none');
    await waitFor(() => {
      expect(screen.getByTestId('value').textContent).toBe('false:resolved:none');
    });

    rerender(
      <RuntimeContext.Provider value={{ executeSource } as any}>
        <ScopeContext.Provider value={makeScope()}>
          <Probe source={{ type: 'source', sourceType: 'api', id: 'b' }} />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('value').textContent).toBe('false:none:boom');
    });
  });
});
