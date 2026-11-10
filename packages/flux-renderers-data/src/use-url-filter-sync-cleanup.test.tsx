import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { useUrlFilterSync } from './use-url-filter-sync.js';

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

// Plan 862 L7: restore retries must stop at unmount, and a dependency change
// must not replay the one-shot restore.
describe('useUrlFilterSync cleanup + one-shot restore (plan 862 L7)', () => {
  it('pending form-echo retries are cleared on unmount', async () => {
    const applyToForm = vi.fn(() => false);
    const args = {
      enabled: true,
      instanceId: 'inst-retry',
      location: { getQuery: () => ({ f: 'a' }), setQuery: vi.fn() },
      scope: { id: 'scope-1', update: vi.fn() },
      queryStatePath: 'query',
      query: { f: 'a' },
      defaultQuery: {},
      applyToForm,
    };
    const view = render(<Probe {...args} />);
    view.unmount();

    await new Promise((r) => setTimeout(r, 300));
    expect(applyToForm).toHaveBeenCalledTimes(1);
  });

  it('dependency change does not replay the restore (scope.update called once)', () => {
    const update = vi.fn();
    const applyToForm = vi.fn(() => true);
    const scope = { id: 'scope-1', update };
    const args = {
      enabled: true,
      instanceId: 'inst-restore',
      location: { getQuery: () => ({ f: 'a' }), setQuery: vi.fn() },
      scope,
      queryStatePath: 'query',
      query: { f: 'a' },
      defaultQuery: {},
      applyToForm,
    };
    const view = render(<Probe {...args} />);
    view.rerender(<Probe {...args} applyToForm={vi.fn(() => true)} />);

    expect(update).toHaveBeenCalledTimes(1);
  });
});

function Probe(props: Record<string, unknown>) {
  const result = useUrlFilterSync(props as never);
  return <div data-sync={String(result)} />;
}
