import React, { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ComponentHandleRegistry } from '@nop-chaos/flux-core';
import { useContainerDomRegistration } from '../container-hooks.js';

// FM-4 plan 645 P1 (react19 manual review F1): useContainerDomRegistration
// runs its layout effect after EVERY render (no dep array) with a ref-triple
// dedup guard. The cleanup unregisters from the registry but never invalidated
// the guard — so any unrelated re-render tore the registration down and the
// next effect run skipped re-registering (triple unchanged), leaving the
// container permanently silent in the registry (container:-targeted
// dialog/drawer fall back to the default container). The fix resets the guard
// in the cleanup; this test pins that a re-render keeps the registration alive
// (old implementation fails the post-rerender assertion).

const registry = (() => {
  const active = new Map<string, HTMLElement>();
  const register = vi.fn((def: { id: string; ref: HTMLElement }) => {
    active.set(def.id, def.ref);
    return () => {
      active.delete(def.id);
    };
  });
  return {
    active,
    register,
    resolve: vi.fn(({ componentId }: { componentId: string }) =>
      active.has(componentId) ? { ref: active.get(componentId) } : null,
    ),
  } as unknown as ComponentHandleRegistry & {
    active: Map<string, HTMLElement>;
    register: ReturnType<typeof vi.fn>;
  };
})();

vi.mock('../hooks.js', () => ({
  useCurrentComponentRegistry: () => registry,
}));

afterEach(cleanup);

function Harness() {
  const ref = useRef<HTMLDivElement>(null);
  useContainerDomRegistration('dialog-host', ref);
  return <div ref={ref} data-testid="host" />;
}

describe('container registration re-render contract (FM-4 plan 645 P1)', () => {
  it('keeps the container registered across unrelated re-renders', () => {
    const view = render(<Harness />);
    expect(registry.register).toHaveBeenCalledTimes(1);
    expect(registry.active.has('dialog-host')).toBe(true);

    // An unrelated parent re-render (same props) must not lose the
    // registration: cleanup runs, then the effect re-registers.
    view.rerender(<Harness />);
    expect(registry.active.has('dialog-host')).toBe(true);
  });

  it('still unregisters on unmount', () => {
    const view = render(<Harness />);
    expect(registry.active.has('dialog-host')).toBe(true);
    view.unmount();
    expect(registry.active.has('dialog-host')).toBe(false);
  });
});
