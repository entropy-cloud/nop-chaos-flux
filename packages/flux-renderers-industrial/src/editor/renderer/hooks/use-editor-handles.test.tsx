import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLeaferMock } from '../../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../../../symbols/register-builtin.js';
import { validEditorConfig } from '../../../test-support/editor-config-fixtures.js';
import { useEditorHandles, type UseEditorHandlesArgs } from './use-editor-handles.js';
import type { ComponentCapabilities, ComponentHandleRegistry } from '@nop-chaos/flux-core';
import type { EditorEngineRuntime } from './use-editor-engine.js';
import { UndoStack } from '../../undo-redo/undo-stack.js';
import { UndoRedoAdapter } from '../../undo-redo/undo-redo-adapter.js';

vi.mock('leafer-ui', () => import('../../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

class MockHandleRegistry {
  private entries: Array<{ id: string; type: string; capabilities: ComponentCapabilities }> = [];
  register(entry: { id: string; type: string; capabilities: ComponentCapabilities }) {
    this.entries.push(entry);
    return () => {
      this.entries = this.entries.filter((e) => e !== entry);
    };
  }
  getCapabilities(id: string): ComponentCapabilities | undefined {
    return this.entries.find((e) => e.id === id)?.capabilities;
  }
}

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

function makeRuntime(): EditorEngineRuntime {
  const session = {
    workingConfig: validEditorConfig(),
    committedBaseline: validEditorConfig(),
    selection: [] as string[],
    mode: 'edit' as const,
    undoStack: new UndoStack(),
  };
  return {
    engine: {} as never,
    session,
    switchMode: () => undefined,
    setSelection: () => undefined,
    clearSelection: () => undefined,
    save: () => JSON.stringify(session.workingConfig),
    load: () => undefined,
    syncWorkingCopy: () => undefined,
    updateWorkingNode: (id: string, patch: Record<string, unknown>) => {
      const node = session.workingConfig.symbols.find((s) => s.id === id);
      if (node) Object.assign(node, patch);
    },
    addWorkingSymbol: (node: { id: string }) => {
      session.workingConfig.symbols.push(node as never);
    },
    removeWorkingSymbol: (id: string) => {
      session.workingConfig.symbols = session.workingConfig.symbols.filter((s) => s.id !== id);
    },
    undoRedo: new UndoRedoAdapter(session.undoStack),
    undo: () => undefined,
    redo: () => undefined,
    groupSymbols: () => undefined,
    ungroupSymbols: () => undefined,
  };
}

function HookHost(props: UseEditorHandlesArgs) {
  useEditorHandles(props);
  return null;
}

describe('useEditorHandles', () => {
  it('registers addSymbol/removeSymbol/updateSymbol/save/load methods', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(
      <HookHost
        componentRegistry={registry as unknown as ComponentHandleRegistry}
        id="editor-1"
        cid={1}
        runtime={runtime}
      />,
    );
    const caps = registry.getCapabilities('editor-1') as ComponentCapabilities | undefined;
    expect(caps).toBeDefined();
    expect(caps?.hasMethod?.('addSymbol')).toBe(true);
    expect(caps?.hasMethod?.('removeSymbol')).toBe(true);
    expect(caps?.hasMethod?.('updateSymbol')).toBe(true);
    expect(caps?.hasMethod?.('save')).toBe(true);
    expect(caps?.hasMethod?.('load')).toBe(true);
    expect(caps?.hasMethod?.('unknownMethod')).toBe(false);
    expect(caps?.listMethods?.()).toEqual([
      'addSymbol',
      'removeSymbol',
      'updateSymbol',
      'save',
      'load',
      'undo',
      'redo',
      'group',
      'ungroup',
    ]);
  });

  it('addSymbol adds to working copy', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('addSymbol', { node: { id: 'new-1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 } }, {} as never) as { ok: boolean };
    expect(result.ok).toBe(true);
    expect(runtime.session.workingConfig.symbols.find((s: { id: string }) => s.id === 'new-1')).toBeDefined();
  });

  it('addSymbol rejects invalid node', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('addSymbol', { node: { foo: 'bar' } }, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('addSymbol rejects null node', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('addSymbol', { node: null }, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('addSymbol rejects duplicate id', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('addSymbol', { node: { id: 'editor-rect', type: 'scada-rect', x: 0, y: 0 } }, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('removeSymbol removes from working copy', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('removeSymbol', { nodeId: 'editor-rect' }, {} as never) as { ok: boolean };
    expect(result.ok).toBe(true);
    expect(runtime.session.workingConfig.symbols.find((s: { id: string }) => s.id === 'editor-rect')).toBeUndefined();
  });

  it('removeSymbol rejects unknown id', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('removeSymbol', { nodeId: 'nonexistent' }, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('removeSymbol rejects missing nodeId', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('removeSymbol', {}, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('updateSymbol rejects unknown nodeId', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('updateSymbol', { nodeId: 'missing', patch: { fill: '#000' } }, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('updateSymbol updates node properties', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('updateSymbol', { nodeId: 'editor-rect', patch: { fill: '#00ff00' } }, {} as never) as { ok: boolean };
    expect(result.ok).toBe(true);
    expect(runtime.session.workingConfig.symbols.find((s: { id: string }) => s.id === 'editor-rect')?.fill).toBe('#00ff00');
  });

  it('updateSymbol rejects invalid patch', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('updateSymbol', { nodeId: 'editor-rect' }, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('save returns serializedConfig', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('save', {}, {} as never) as { ok: boolean; data?: unknown };
    expect(result.ok).toBe(true);
    expect(typeof result.data).toBe('string');
  });

  it('load replaces working copy', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('load', { config: { version: 1, variables: [], symbols: [] } }, {} as never) as { ok: boolean };
    expect(result.ok).toBe(true);
  });

  it('returns not-mounted when runtime is null', () => {
    const registry = new MockHandleRegistry();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={null} />);
    const result = registry.getCapabilities('e')!.invoke('save', {}, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('unknown method returns error', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('unknownMethod', {}, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('undo returns no-undo when stack empty', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('undo', {}, {} as never) as { ok: boolean; error?: Error };
    expect(result.ok).toBe(false);
    expect((result as { error?: { message?: string } }).error?.message).toBe('no-undo');
  });

  it('undo succeeds when stack non-empty', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    let undoCalled = false;
    runtime.undo = () => {
      undoCalled = true;
    };
    // push an entry so canUndo is true
    runtime.session.undoStack.push({
      forward: { added: [], removed: [], updated: [{ id: 'editor-rect', patch: { x: 1 } }] },
      inverse: { added: [], removed: [], updated: [{ id: 'editor-rect', patch: { x: 0 } }] },
      operationKind: 'update-symbol',
      timestamp: 0,
    });
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('undo', {}, {} as never) as { ok: boolean };
    expect(result.ok).toBe(true);
    expect(undoCalled).toBe(true);
  });

  it('redo returns no-redo when stack empty', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('redo', {}, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('redo succeeds when redo stack non-empty', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    let redoCalled = false;
    runtime.redo = () => {
      redoCalled = true;
    };
    // push + undo to create a redo entry
    runtime.session.undoStack.push({
      forward: { added: [], removed: [], updated: [{ id: 'editor-rect', patch: { x: 1 } }] },
      inverse: { added: [], removed: [], updated: [{ id: 'editor-rect', patch: { x: 0 } }] },
      operationKind: 'update-symbol',
      timestamp: 0,
    });
    runtime.session.undoStack.popForUndo();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('redo', {}, {} as never) as { ok: boolean };
    expect(result.ok).toBe(true);
    expect(redoCalled).toBe(true);
  });

  it('group rejects empty selection', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('group', { nodeIds: [] }, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('group rejects missing nodeIds', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('group', {}, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('group calls groupSymbols', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    let grouped: string[] | null = null;
    runtime.groupSymbols = (ids: string[]) => {
      grouped = ids;
    };
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('group', { nodeIds: ['editor-rect', 'editor-rect-2'] }, {} as never) as { ok: boolean };
    expect(result.ok).toBe(true);
    expect(grouped).toEqual(['editor-rect', 'editor-rect-2']);
  });

  it('m-3: group rejects nonexistent nodeIds with symbol-not-found', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('group', { nodeIds: ['editor-rect', 'nope'] }, {} as never) as { ok: boolean; error: Error };
    expect(result.ok).toBe(false);
    expect(result.error.message).toBe('symbol-not-found');
  });

  it('ungroup rejects missing groupId', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('ungroup', {}, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('ungroup rejects unknown groupId', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('ungroup', { groupId: 'missing' }, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('ungroup rejects non-group node', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('ungroup', { groupId: 'editor-rect' }, {} as never) as { ok: boolean };
    expect(result.ok).toBe(false);
  });

  it('ungroup calls ungroupSymbols for valid group', () => {
    const registry = new MockHandleRegistry();
    const runtime = makeRuntime();
    runtime.session.workingConfig.symbols.push({
      id: 'g1',
      type: 'scada-group',
      x: 0,
      y: 0,
      children: [{ id: 'c1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }],
    } as never);
    let ungroupedId: string | null = null;
    runtime.ungroupSymbols = (id: string) => {
      ungroupedId = id;
    };
    render(<HookHost componentRegistry={registry as unknown as ComponentHandleRegistry} id="e" cid={1} runtime={runtime} />);
    const result = registry.getCapabilities('e')!.invoke('ungroup', { groupId: 'g1' }, {} as never) as { ok: boolean };
    expect(result.ok).toBe(true);
    expect(ungroupedId).toBe('g1');
  });
});
