import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const useScopeSelectorMock = vi.fn();
const useRenderScopeMock = vi.fn(() => ({ update: vi.fn() }));

vi.mock('@nop-chaos/flux-react', () => ({
  useRenderScope: () => useRenderScopeMock(),
  useScopeSelector: (...args: unknown[]) => useScopeSelectorMock(...args),
}));

import { useOwnedAxisValue } from './interaction-owner.js';

function OwnedAxisProbe(props: {
  ownership?: 'local' | 'controlled' | 'scope';
  statePath?: string;
}) {
  const owned = useOwnedAxisValue<string>({
    ownership: props.ownership,
    statePath: props.statePath,
    fallbackValue: 'fallback',
  });
  return <span data-testid="owned-axis-value">{owned.value}</span>;
}

describe('useOwnedAxisValue', () => {
  afterEach(() => {
    cleanup();
    useScopeSelectorMock.mockReset();
    useRenderScopeMock.mockClear();
  });

  it('subscribes only to the configured scope path in scope ownership mode', () => {
    useScopeSelectorMock.mockReturnValueOnce('scoped');

    render(<OwnedAxisProbe ownership="scope" statePath="ui.activeTab" />);

    expect(screen.getByTestId('owned-axis-value').textContent).toBe('scoped');
    expect(useScopeSelectorMock).toHaveBeenCalledWith(
      expect.any(Function),
      Object.is,
      expect.objectContaining({
        enabled: true,
        fallback: undefined,
        paths: ['ui.activeTab'],
      }),
    );
  });

  it('disables scope subscription outside scope ownership mode', () => {
    useScopeSelectorMock.mockReturnValueOnce(undefined);

    render(<OwnedAxisProbe ownership="local" statePath="ui.activeTab" />);

    expect(screen.getByTestId('owned-axis-value').textContent).toBe('fallback');
    expect(useScopeSelectorMock).toHaveBeenCalledWith(
      expect.any(Function),
      Object.is,
      expect.objectContaining({
        enabled: false,
        fallback: undefined,
        paths: undefined,
      }),
    );
  });
});
