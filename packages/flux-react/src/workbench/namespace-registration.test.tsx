import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ActionNamespaceProvider, ActionScope } from '@nop-chaos/flux-core';
import { useNamespaceRegistration } from './hooks.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useNamespaceRegistration', () => {
  it('registers namespace when actionScope and provider are present', () => {
    const unregister = vi.fn();
    const registerNamespace = vi.fn(() => unregister);
    const actionScope = { registerNamespace } as unknown as ActionScope;
    const provider: ActionNamespaceProvider = {
      kind: 'host',
      invoke: vi.fn(async () => ({ ok: true })),
    };

    function Probe() {
      useNamespaceRegistration(actionScope, 'demo', provider);
      return <span data-testid="probe">registered</span>;
    }

    render(<Probe />);

    expect(registerNamespace).toHaveBeenCalledWith('demo', provider);
  });

  it('does nothing when actionScope is null', () => {
    const provider: ActionNamespaceProvider = {
      kind: 'host',
      invoke: vi.fn(async () => ({ ok: true })),
    };

    function Probe() {
      useNamespaceRegistration(null, 'demo', provider);
      return <span data-testid="probe">ok</span>;
    }

    render(<Probe />);
    expect(screen.getByTestId('probe')).toBeTruthy();
  });

  it('does nothing when provider is null', () => {
    const registerNamespace = vi.fn();
    const actionScope = { registerNamespace } as unknown as ActionScope;

    function Probe() {
      useNamespaceRegistration(actionScope, 'demo', null);
      return <span data-testid="probe">ok</span>;
    }

    render(<Probe />);
    expect(registerNamespace).not.toHaveBeenCalled();
  });

  it('does nothing when actionScope is undefined', () => {
    const provider: ActionNamespaceProvider = {
      kind: 'host',
      invoke: vi.fn(async () => ({ ok: true })),
    };

    function Probe() {
      useNamespaceRegistration(undefined, 'demo', provider);
      return <span data-testid="probe">ok</span>;
    }

    render(<Probe />);
    expect(screen.getByTestId('probe')).toBeTruthy();
  });

  it('unregisters on unmount', () => {
    const unregister = vi.fn();
    const registerNamespace = vi.fn(() => unregister);
    const actionScope = { registerNamespace } as unknown as ActionScope;
    const provider: ActionNamespaceProvider = {
      kind: 'host',
      invoke: vi.fn(async () => ({ ok: true })),
    };

    function Probe() {
      useNamespaceRegistration(actionScope, 'demo', provider);
      return <span data-testid="probe">ok</span>;
    }

    const { unmount } = render(<Probe />);
    expect(registerNamespace).toHaveBeenCalledWith('demo', provider);

    unmount();
    expect(unregister).toHaveBeenCalled();
  });

  it('re-registers when namespace changes', () => {
    const unregister = vi.fn();
    const registerNamespace = vi.fn(() => unregister);
    const actionScope = { registerNamespace } as unknown as ActionScope;
    const provider: ActionNamespaceProvider = {
      kind: 'host',
      invoke: vi.fn(async () => ({ ok: true })),
    };

    function Probe({ namespace }: { namespace: string }) {
      useNamespaceRegistration(actionScope, namespace, provider);
      return <span data-testid="probe">{namespace}</span>;
    }

    const { rerender } = render(<Probe namespace="ns1" />);
    expect(registerNamespace).toHaveBeenCalledWith('ns1', provider);

    rerender(<Probe namespace="ns2" />);
    expect(registerNamespace).toHaveBeenCalledWith('ns2', provider);
  });
});
