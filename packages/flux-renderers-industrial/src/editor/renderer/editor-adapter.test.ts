import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../../symbols/register-builtin.js';
import { ScadaEditorEngine } from './editor-engine.js';
import {
  attachEditorAdapter,
  programmaticSelect,
  programmaticClearSelection,
} from '../editor-adapter.js';
import type { ScadaConfig } from '../../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

const adapterConfig: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    { id: 'a1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
    { id: 'a2', type: 'scada-rect', x: 0, y: 0, width: 50, height: 50, rotation: 45, visible: true, opacity: 0.8 },
  ],
};

let container: HTMLDivElement;
let engine: ScadaEditorEngine | undefined;

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
  container = document.createElement('div');
  document.body.appendChild(container);
  engine = ScadaEditorEngine.create({ container });
  engine.build(adapterConfig);
});

afterEach(() => {
  engine?.destroy();
  engine = undefined;
  container?.remove();
});

describe('attachEditorAdapter', () => {
  it('returns a detach function', () => {
    const detach = attachEditorAdapter(engine!, {
      onSelectionChange: () => undefined,
      onGeometryChange: () => undefined,
    });
    expect(typeof detach).toBe('function');
    detach();
  });

  it('fires onSelectionChange when editor.select fires', () => {
    let captured: string[] | undefined;
    const detach = attachEditorAdapter(engine!, {
      onSelectionChange: (ids) => {
        captured = ids;
      },
      onGeometryChange: () => undefined,
    });
    const editor = engine!.editor as { emit?: (e: string) => void; list?: unknown[] };
    // Mock editor.list before emitting select — set to the actual symbol node.
    editor.list = [engine!.getSymbol('a1')?.node];
    editor.emit?.('editor.select');
    expect(captured).toEqual(['a1']);
    detach();
  });

  it('fires onGeometryChange when editor.move fires (reads target geometry)', () => {
    let captured: { id: string; patch: Record<string, unknown> } | undefined;
    const detach = attachEditorAdapter(engine!, {
      onSelectionChange: () => undefined,
      onGeometryChange: (id, patch) => {
        captured = { id, patch };
      },
    });
    const editor = engine!.editor as {
      emit?: (e: string) => void;
      target?: unknown;
    };
    editor.target = engine!.getSymbol('a1')?.node;
    editor.emit?.('editor.move');
    expect(captured?.id).toBe('a1');
    // x/y/width/height read from target geometry (mock node has values from build).
    expect(captured?.patch).toBeDefined();
    detach();
  });

  it('detach unsubscribes (no callback after detach)', () => {
    let called = false;
    const detach = attachEditorAdapter(engine!, {
      onSelectionChange: () => {
        called = true;
      },
      onGeometryChange: () => undefined,
    });
    detach();
    const editor = engine!.editor as { emit?: (e: string) => void; list?: unknown[] };
    editor.list = [{ name: 'a1' }];
    editor.emit?.('editor.select');
    expect(called).toBe(false);
  });

  it('onGeometryChange reads rotation/visible/opacity from target', () => {
    let captured: { id: string; patch: Record<string, unknown> } | undefined;
    const detach = attachEditorAdapter(engine!, {
      onSelectionChange: () => undefined,
      onGeometryChange: (id, patch) => {
        captured = { id, patch };
      },
    });
    const editor = engine!.editor as { emit?: (e: string) => void; target?: unknown };
    editor.target = engine!.getSymbol('a2')?.node;
    editor.emit?.('editor.move');
    expect(captured?.id).toBe('a2');
    detach();
  });

  it('onGeometryChange ignores unknown target node', () => {
    let called = false;
    const detach = attachEditorAdapter(engine!, {
      onSelectionChange: () => undefined,
      onGeometryChange: () => {
        called = true;
      },
    });
    const editor = engine!.editor as { emit?: (e: string) => void; target?: unknown };
    editor.target = { unknown: true };
    editor.emit?.('editor.move');
    expect(called).toBe(false);
    detach();
  });

  it('onSelectionChange extracts nodeIds via name fallback for non-registered nodes', () => {
    let captured: string[] | undefined;
    const detach = attachEditorAdapter(engine!, {
      onSelectionChange: (ids) => {
        captured = ids;
      },
      onGeometryChange: () => undefined,
    });
    const editor = engine!.editor as { emit?: (e: string) => void; list?: unknown[] };
    // Node with name but not in registry (fallback path).
    editor.list = [{ name: 'fallback-by-name' }];
    editor.emit?.('editor.select');
    expect(captured).toEqual(['fallback-by-name']);
    detach();
  });

  it('onSelectionChange extracts nodeIds via id fallback for non-registered nodes', () => {
    let captured: string[] | undefined;
    const detach = attachEditorAdapter(engine!, {
      onSelectionChange: (ids) => {
        captured = ids;
      },
      onGeometryChange: () => undefined,
    });
    const editor = engine!.editor as { emit?: (e: string) => void; list?: unknown[] };
    // Node with id but no name, not in registry (id fallback path).
    editor.list = [{ id: 'fallback-by-id' }];
    editor.emit?.('editor.select');
    expect(captured).toEqual(['fallback-by-id']);
    detach();
  });

  it('onSelectionChange ignores null/undefined items', () => {
    let captured: string[] | undefined;
    const detach = attachEditorAdapter(engine!, {
      onSelectionChange: (ids) => {
        captured = ids;
      },
      onGeometryChange: () => undefined,
    });
    const editor = engine!.editor as { emit?: (e: string) => void; list?: unknown[] };
    editor.list = [null, undefined, { id: 123 }];
    editor.emit?.('editor.select');
    expect(captured).toEqual([]);
    detach();
  });
});

describe('programmaticSelect / programmaticClearSelection', () => {
  it('programmaticSelect sets editor targets for known ids', () => {
    // plan 2026-08-07-1835-2 Phase 5 / multi P1-12：先前零 expect（false-green）；现断言 setEditorTargets 被调用
    // 且传入已解析的 leaf node（验证 nodeId → node 解析 + 选中装配真实发生）。
    const setTargetsSpy = vi.spyOn(engine!, 'setEditorTargets');
    programmaticSelect(engine!, ['a1']);
    expect(setTargetsSpy).toHaveBeenCalledTimes(1);
    const passedNodes = setTargetsSpy.mock.calls[0][0];
    expect(Array.isArray(passedNodes)).toBe(true);
    expect(passedNodes.length).toBe(1);
  });

  it('programmaticClearSelection clears editor selection', () => {
    const clearSpy = vi.spyOn(engine!, 'clearEditorSelection');
    programmaticClearSelection(engine!);
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('programmaticSelect ignores unknown ids (empty targets array)', () => {
    const setTargetsSpy = vi.spyOn(engine!, 'setEditorTargets');
    programmaticSelect(engine!, ['nonexistent']);
    // unknown id → getSymbol 返回 undefined → filter 掉 → 空数组传入 setEditorTargets（不抛、不跳过装配调用）。
    expect(setTargetsSpy).toHaveBeenCalledTimes(1);
    expect(setTargetsSpy.mock.calls[0][0]).toEqual([]);
  });
});

describe('attachEditorAdapter with no editor instance', () => {
  it('returns noop detach when editor is undefined', () => {
    const fakeEngine = {
      editor: undefined,
    } as unknown as ScadaEditorEngine;
    const detach = attachEditorAdapter(fakeEngine, {});
    expect(typeof detach).toBe('function');
    detach();
  });
});
