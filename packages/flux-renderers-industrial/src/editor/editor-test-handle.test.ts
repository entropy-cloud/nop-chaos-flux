import { describe, it, expect, afterEach } from 'vitest';
import {
  scadaEditorTestHandleKey,
  mountScadaEditorTestHandle,
  removeScadaEditorTestHandle,
  readScadaEditorTestHandle,
  type ScadaEditorTestHandle,
} from './editor-test-handle.js';

afterEach(() => {
  delete (window as unknown as Record<string, unknown>)[scadaEditorTestHandleKey(42)];
  delete (window as unknown as Record<string, unknown>)[scadaEditorTestHandleKey(99)];
});

function makeHandle(overrides: Partial<ScadaEditorTestHandle> = {}): ScadaEditorTestHandle {
  return {
    session: {
      workingConfig: { version: 1, variables: [], symbols: [] },
      committedBaseline: { version: 1, variables: [], symbols: [] },
      canUndo: false,
      canRedo: false,
      selection: [],
      mode: 'edit',
    },
    editor: {},
    engine: {},
    app: {},
    switchMode: () => undefined,
    setSelection: () => undefined,
    clearSelection: () => undefined,
    save: () => '{}',
    load: () => undefined,
    addSymbol: () => undefined,
    removeSymbol: () => undefined,
    updateSymbol: () => undefined,
    group: () => undefined,
    ungroup: () => undefined,
    undo: () => undefined,
    redo: () => undefined,
    connection: {
      connect: () => undefined,
      disconnect: () => undefined,
      listConnections: () => [],
    },
    undoRedo: {
      undo: () => undefined,
      redo: () => undefined,
      getStackState: () => ({ canUndo: false, canRedo: false, undoStackDepth: 0, redoStackDepth: 0 }),
      pushUndo: () => undefined,
    },
    toolbox: {
      fit: () => false,
      center: () => false,
      zoomAt: () => undefined,
      resetView: () => undefined,
      getViewport: () => ({ x: 0, y: 0, scale: 1 }),
      align: () => false,
      distribute: () => false,
      toTop: () => false,
      toBottom: () => false,
      moveUp: () => false,
      moveDown: () => false,
      copy: () => 0,
      cut: () => 0,
      paste: () => [],
      getClipboard: () => null,
      exportConfig: () => '{}',
      importConfig: () => false,
      listSymbolLibrary: () => [],
    },
    ...overrides,
  };
}

describe('scadaEditorTestHandleKey (双态独立 cid 命名空间)', () => {
  it('produces __flux_scada_editor_<cid> (distinct from runtime __flux_scada_<cid>)', () => {
    expect(scadaEditorTestHandleKey(42)).toBe('__flux_scada_editor_42');
    // runtime key would be __flux_scada_42 — editor key has '_editor_' infix.
    expect(scadaEditorTestHandleKey(42)).not.toBe('__flux_scada_42');
  });
});

describe('mount / read / remove', () => {
  it('mounts and reads back the handle', () => {
    const handle = makeHandle();
    mountScadaEditorTestHandle(42, handle);
    expect(readScadaEditorTestHandle(42)).toBe(handle);
  });

  it('readScadaEditorTestHandle returns undefined when not mounted', () => {
    expect(readScadaEditorTestHandle(99)).toBeUndefined();
  });

  it('remove deletes the handle (R5 不泄漏验证 #4: unmount 无残留)', () => {
    const handle = makeHandle();
    mountScadaEditorTestHandle(42, handle);
    removeScadaEditorTestHandle(42);
    expect(readScadaEditorTestHandle(42)).toBeUndefined();
  });

  it('does not collide with runtime __flux_scada_<cid> namespace', () => {
    const editorHandle = makeHandle({ editor: 'editor-instance' });
    mountScadaEditorTestHandle(42, editorHandle);
    // simulate runtime handle at __flux_scada_42
    (window as unknown as Record<string, unknown>)['__flux_scada_42'] = { runtime: true };
    expect(readScadaEditorTestHandle(42)).toBe(editorHandle);
    expect((window as unknown as Record<string, unknown>)['__flux_scada_42']).toEqual({ runtime: true });
  });
});
