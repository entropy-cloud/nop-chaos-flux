import { describe, expect, it, vi } from 'vitest';
import { createDesignerStoreAdapter } from './designer-store-adapter.js';
import type { DesignerCore } from '../designer-core-types.js';
import type { DesignerSnapshot } from '../types.js';

function createMockCore(snapshotOverrides?: Partial<DesignerSnapshot>): DesignerCore {
  const snapshot: DesignerSnapshot = {
    doc: { id: 'doc-1', kind: 'flow', name: 'Test', version: '1.0', nodes: [], edges: [] },
    selection: { type: 'none' },
    activeNode: null,
    activeEdge: null,
    activeBranch: null,
    canUndo: false,
    canRedo: false,
    isDirty: false,
    readonly: false,
    gridEnabled: false,
    paletteCollapsed: false,
    inspectorCollapsed: false,
    viewport: { x: 0, y: 0, zoom: 1 },
    ...snapshotOverrides,
  };

  const listeners = new Set<(event: any) => void>();

  return {
    getSnapshot: () => snapshot,
    subscribe: vi.fn((listener: (event: any) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }),
  } as unknown as DesignerCore;
}

describe('createDesignerStoreAdapter', () => {
  it('returns an object with getState, subscribe, and getSnapshot methods', () => {
    const core = createMockCore();
    const adapter = createDesignerStoreAdapter(core);

    expect(adapter).toHaveProperty('getState');
    expect(typeof adapter.getState).toBe('function');
    expect(adapter).toHaveProperty('subscribe');
    expect(typeof adapter.subscribe).toBe('function');
    expect(adapter).toHaveProperty('getSnapshot');
    expect(typeof adapter.getSnapshot).toBe('function');
  });

  it('getState returns the initial snapshot from core', () => {
    const core = createMockCore({ isDirty: true });
    const adapter = createDesignerStoreAdapter(core);

    expect(adapter.getState().isDirty).toBe(true);
    expect(adapter.getState().doc.id).toBe('doc-1');
  });

  it('getSnapshot returns the same value as getState', () => {
    const core = createMockCore();
    const adapter = createDesignerStoreAdapter(core);

    expect(adapter.getSnapshot()).toBe(adapter.getState());
  });

  it('subscribe registers a listener on the core and returns a dispose function', () => {
    const core = createMockCore();
    const adapter = createDesignerStoreAdapter(core);
    const listener = vi.fn();

    const dispose = adapter.subscribe(listener);

    expect(typeof dispose).toBe('function');
    expect(core.subscribe).toHaveBeenCalledTimes(1);
  });

  it('publishes updated snapshot to listeners when core notifies', () => {
    const snapshot1: DesignerSnapshot = {
      doc: { id: 'doc-1', kind: 'flow', name: 'Test', version: '1.0', nodes: [], edges: [] },
      selection: { type: 'none' },
      activeNode: null,
      activeEdge: null,
      activeBranch: null,
      canUndo: false,
      canRedo: false,
      isDirty: false,
      readonly: false,
      gridEnabled: false,
      paletteCollapsed: false,
      inspectorCollapsed: false,
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    const snapshot2: DesignerSnapshot = {
      ...snapshot1,
      isDirty: true,
    };

    let coreListener: ((event: any) => void) | undefined;
    const core: DesignerCore = {
      getSnapshot: vi.fn()
        .mockReturnValueOnce(snapshot1)
        .mockReturnValueOnce(snapshot2),
      subscribe: vi.fn((listener: (event: any) => void) => {
        coreListener = listener;
        return () => {};
      }),
    } as unknown as DesignerCore;

    const adapter = createDesignerStoreAdapter(core);
    expect(adapter.getState().isDirty).toBe(false);

    const listener = vi.fn();
    adapter.subscribe(listener);

    coreListener!({ type: 'dirtyChanged', isDirty: true });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(adapter.getState().isDirty).toBe(true);
  });

  it('dispose function returned by subscribe removes the listener', () => {
    let _coreListener: ((event: any) => void) | undefined;
    let disposeCalled = false;

    const core: DesignerCore = {
      getSnapshot: () => ({
        doc: { id: 'doc-1', kind: 'flow', name: 'Test', version: '1.0', nodes: [], edges: [] },
        selection: { type: 'none' },
        activeNode: null,
        activeEdge: null,
        activeBranch: null,
        canUndo: false,
        canRedo: false,
        isDirty: false,
        readonly: false,
        gridEnabled: false,
        paletteCollapsed: false,
        inspectorCollapsed: false,
        viewport: { x: 0, y: 0, zoom: 1 },
      }),
      subscribe: vi.fn((listener: (event: any) => void) => {
        _coreListener = listener;
        return () => {
          disposeCalled = true;
        };
      }),
    } as unknown as DesignerCore;

    const adapter = createDesignerStoreAdapter(core);
    const listener = vi.fn();

    const dispose = adapter.subscribe(listener);
    dispose();

    expect(disposeCalled).toBe(true);
  });
});
