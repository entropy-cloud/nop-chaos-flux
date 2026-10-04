import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useEditorComponentHandles } from './use-editor-component-handles.js';

afterEach(() => {
  vi.restoreAllMocks();
});

type Registry = {
  register: ReturnType<typeof vi.fn>;
};

function mountHarness(
  registry: Registry,
  args: Partial<Parameters<typeof useEditorComponentHandles>[0]> = {},
) {
  function Harness() {
    useEditorComponentHandles({
      componentRegistry: registry as never,
      id: 'ed-1',
      cid: 7,
      componentType: 'demo-editor',
      methods: ['save', 'undo'],
      invoke: (method: string) => ({ ok: true, data: method }),
      ...args,
    } as never);
    return null;
  }
  const { unmount } = render(<Harness />);
  return { unmount };
}

describe('useEditorComponentHandles (P4.3)', () => {
  it('registers capabilities reflecting the declared method set', async () => {
    const register = vi.fn(() => () => undefined);
    mountHarness({ register });
    await waitFor(() => expect(register).toHaveBeenCalled());
    const call = register.mock.calls[0] as
      | Array<{ id: string; _cid: number; type: string; capabilities: { hasMethod(m: string): boolean; listMethods(): string[] } }>
      | undefined;
    const handle = call![0];
    expect(handle.id).toBe('ed-1');
    expect(handle._cid).toBe(7);
    expect(handle.type).toBe('demo-editor');
    expect(handle.capabilities.hasMethod('save')).toBe(true);
    expect(handle.capabilities.hasMethod('redo')).toBe(false);
    expect(handle.capabilities.listMethods()).toEqual(['save', 'undo']);
  });

  it('forwards invoke with payload to the family callback', async () => {
    const invoke = vi.fn((method: string, payload: unknown) => ({ ok: true, data: { method, payload } }));
    const register = vi.fn(() => () => undefined);
    mountHarness({ register }, { invoke } as never);
    await waitFor(() => expect(register).toHaveBeenCalled());
    const call = register.mock.calls[0] as
      | Array<{ capabilities: { invoke(m: string, p?: unknown): unknown } }>
      | undefined;
    const capabilities = call![0].capabilities;
    const result = capabilities.invoke('save', { id: 'x' }) as { ok: boolean; data: { method: string; payload: unknown } };
    expect(result.ok).toBe(true);
    expect(result.data.method).toBe('save');
    expect(result.data.payload).toEqual({ id: 'x' });
  });

  it('cleans up the registration on unmount', () => {
    const unregister = vi.fn();
    const register = vi.fn(() => unregister);
    const { unmount } = mountHarness({ register });
    expect(unregister).not.toHaveBeenCalled();
    unmount();
    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it('reads latest args on invoke (latest-ref semantics)', async () => {
    const invokeA = vi.fn(() => ({ ok: true, data: 'A' }));
    const invokeB = vi.fn(() => ({ ok: true, data: 'B' }));
    const register = vi.fn(() => () => undefined);
    function Harness({ invoke }: { invoke: (m: string) => unknown }) {
      useEditorComponentHandles({
        componentRegistry: { register } as never,
        id: 'ed-1',
        cid: 7,
        componentType: 'demo-editor',
        methods: ['save'],
        invoke,
      } as never);
      return null;
    }
    const { rerender } = render(<Harness invoke={invokeA} />);
    rerender(<Harness invoke={invokeB} />);
    const call = register.mock.calls[0] as
      | Array<{ capabilities: { invoke(m: string): unknown } }>
      | undefined;
    const capabilities = call![0].capabilities;
    const result = capabilities.invoke('save') as { data: string };
    expect(result.data).toBe('B');
  });
});
