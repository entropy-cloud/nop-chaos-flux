import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useDashboardEditorHandles } from './use-dashboard-editor-handles.js';
import type { EditorCore } from '@nop-chaos/editor-core';

afterEach(() => {
  vi.restoreAllMocks();
});

type Capabilities = {
  hasMethod(m: string): boolean;
  listMethods(): string[];
  invoke(m: string, p?: unknown): { ok: boolean; data?: unknown; error?: Error };
};

function mount(args: {
  core: Partial<EditorCore> | null;
  onCommitted?: (serialized: string, layout: unknown) => void;
}) {
  const register = vi.fn(() => () => undefined);
  function Harness() {
    useDashboardEditorHandles({
      componentRegistry: { register } as never,
      id: 'dash-1',
      cid: 3,
      core: args.core as EditorCore<never, never> | null,
      onCommitted: args.onCommitted,
    });
    return null;
  }
  render(<Harness />);
  const call = register.mock.calls[0] as Array<{ capabilities: Capabilities }> | undefined;
  return { register, handle: call?.[0]?.capabilities };
}

describe('dashboard editor handles via shared helper (P4.3)', () => {
  const coreStub = (overrides: Record<string, unknown> = {}) =>
    ({
      commit: vi.fn(() => ({ ok: true, serialized: '{"panels":[]}' })),
      undo: vi.fn(() => true),
      redo: vi.fn(() => true),
      getState: vi.fn(() => ({ working: { panels: [{ id: 'p1' }] } })),
      ...overrides,
    }) as never as EditorCore;

  it('registers the four-method capability set on the dashboard-editor type', () => {
    const { handle } = mount({ core: coreStub() });
    expect(handle).toBeDefined();
    expect(handle!.hasMethod('save')).toBe(true);
    expect(handle!.hasMethod('getLayout')).toBe(true);
    expect(handle!.hasMethod('unknown')).toBe(false);
    expect(handle!.listMethods()).toEqual(['save', 'undo', 'redo', 'getLayout']);
  });

  it('invoke maps save → commit + onCommitted(serialized, working)', () => {
    const onCommitted = vi.fn();
    const core = coreStub();
    const { handle } = mount({ core, onCommitted });
    const result = handle!.invoke('save') as { ok: boolean; data: string };
    expect(result.ok).toBe(true);
    expect(result.data).toBe('{"panels":[]}');
    expect(onCommitted).toHaveBeenCalledWith('{"panels":[]}', core.getState().working);
  });

  it('invoke maps undo/redo/getLayout and surfaces not-mounted', () => {
    const { handle } = mount({ core: coreStub() });
    expect(handle!.invoke('undo').ok).toBe(true);
    expect(handle!.invoke('redo').ok).toBe(true);
    expect((handle!.invoke('getLayout') as { data: unknown }).data).toEqual([{ id: 'p1' }]);
    const unmounted = mount({ core: null });
    expect(unmounted.handle!.invoke('save').ok).toBe(false);
  });
});
