import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { ScadaEditorEngine } from './renderer/editor-engine.js';
import { createRuntimeCore, type EditorRuntimeContext, type UseEditorEngineArgs } from './runtime-factories.js';
import { buildRuntimeMutators } from './runtime-mutators.js';
import { buildToolboxRuntime } from './toolbox-runtime.js';
import { createScadaEditorSession } from './editor-session.js';
import type { ScadaConfig } from '../serialization/config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

const baseConfig: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [{ id: 'a', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }],
};

interface Setup {
  engine: ScadaEditorEngine;
  session: ReturnType<typeof createScadaEditorSession>;
  ctx: EditorRuntimeContext;
  mutators: ReturnType<typeof buildRuntimeMutators>;
  toolbox: ReturnType<typeof buildToolboxRuntime>;
  latest: { current: UseEditorEngineArgs };
  onSelectionChange: Mock<(nodeIds: string[]) => void>;
  onError: Mock<(code: string, message: string) => void>;
  container: HTMLDivElement;
  detachAdapter: () => void;
}

function makeLatest(
  onError: Mock<(code: string, message: string) => void>,
  onSelectionChange: Mock<(nodeIds: string[]) => void>,
): { current: UseEditorEngineArgs } {
  return {
    current: {
      containerRef: { current: null },
      initialConfig: baseConfig,
      commitPolicy: 'manual',
      onError,
      onSelectionChange,
    },
  };
}

function setup(): Setup {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const engine = ScadaEditorEngine.create({ container });
  engine.build(baseConfig);
  const session = createScadaEditorSession(baseConfig);
  const onError = vi.fn<(code: string, message: string) => void>();
  const onSelectionChange = vi.fn<(nodeIds: string[]) => void>();
  const latest = makeLatest(onError, onSelectionChange);
  const core = createRuntimeCore(engine, session, latest, { current: false });
  if (!core) throw new Error('test setup failed: createRuntimeCore returned null');
  const mutators = buildRuntimeMutators(core.ctx);
  const toolbox = buildToolboxRuntime(core.ctx);
  core.ctx.save = mutators.save;
  return { engine, session, ctx: core.ctx, mutators, toolbox, latest, onSelectionChange, onError, container, detachAdapter: core.detachAdapter };
}

// plan 2026-08-08-1809-2 Phase 1 / F3：拖拽落点 id 永不与 working copy 现有 id 碰撞。
describe('F3 — addWorkingSymbol id collision dedup (single-owner discipline)', () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    s.detachAdapter();
    s.engine.destroy();
    s.container.remove();
    vi.restoreAllMocks();
  });

  it('load(rect-1) → drop injects rect-1 → new id !== rect-1 and no duplicate id in working copy', () => {
    const { mutators, session } = s;
    mutators.load({
      version: 1,
      variables: [],
      symbols: [{ id: 'rect-1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }],
    });
    // Simulate the canvas drop / palette click idCounter-generated id (`rect-1`) colliding with the loaded one.
    mutators.addWorkingSymbol({ id: 'rect-1', type: 'scada-rect', x: 100, y: 100, width: 10, height: 10 });
    const ids = session.workingConfig.symbols.map((n) => n.id);
    // 原图元保留 + 新图元 id 自增到 rect-2（无重复 rect-1）。
    expect(ids.filter((i) => i === 'rect-1')).toHaveLength(1);
    expect(ids).toContain('rect-2');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('collisions chain-increment (rect-1 and rect-2 present → next is rect-3)', () => {
    const { mutators, session } = s;
    mutators.load({
      version: 1,
      variables: [],
      symbols: [
        { id: 'rect-1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 },
        { id: 'rect-2', type: 'scada-rect', x: 20, y: 20, width: 10, height: 10 },
      ],
    });
    mutators.addWorkingSymbol({ id: 'rect-1', type: 'scada-rect', x: 40, y: 40, width: 10, height: 10 });
    const ids = session.workingConfig.symbols.map((n) => n.id);
    expect(ids).toContain('rect-3');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('non-colliding id passes through unchanged', () => {
    const { mutators, session } = s;
    mutators.addWorkingSymbol({ id: 'unique-7', type: 'scada-rect', x: 0, y: 0, width: 5, height: 5 });
    expect(session.workingConfig.symbols.map((n) => n.id)).toContain('unique-7');
  });
});

// plan 2026-08-08-1809-2 Phase 2 / P1-1：load / importConfig 在 resetSession 前中止事务态。
describe('P1-1 — load / importConfig abort in-flight transaction', () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    s.detachAdapter();
    s.engine.destroy();
    s.container.remove();
    vi.restoreAllMocks();
  });

  it('load mid-transaction clears txn state + stack stays empty + late commit pushes nothing', () => {
    const { ctx, session, mutators } = s;
    ctx.undoRedo.beginTransaction('transform-move', session.workingConfig);
    expect(ctx.undoRedo.isInTransaction).toBe(true);
    // working copy mutated mid-transaction (simulates a drag frame).
    session.workingConfig.symbols[0].x = 999;
    // programmatic load interrupts the drag.
    mutators.load({
      version: 1,
      variables: [],
      symbols: [{ id: 'fresh', type: 'scada-rect', x: 0, y: 0, width: 5, height: 5 }],
    });
    expect(ctx.undoRedo.isInTransaction).toBe(false);
    expect(session.undoStack.canUndo).toBe(false);
    // late pointerup commit must not produce a bogus giant diff entry.
    const entry = ctx.undoRedo.commitTransaction(session.workingConfig);
    expect(entry).toBeUndefined();
    expect(session.undoStack.canUndo).toBe(false);
    expect(session.workingConfig.symbols.map((n) => n.id)).toEqual(['fresh']);
  });

  it('importConfig mid-transaction clears txn state + stack stays empty + late commit pushes nothing', () => {
    const { ctx, session, toolbox } = s;
    ctx.undoRedo.beginTransaction('transform-move', session.workingConfig);
    session.workingConfig.symbols[0].x = 999;
    const ok = toolbox.importConfig({
      version: 1,
      variables: [],
      symbols: [{ id: 'imported', type: 'scada-rect', x: 0, y: 0, width: 5, height: 5 }],
    });
    expect(ok).toBe(true);
    expect(ctx.undoRedo.isInTransaction).toBe(false);
    expect(session.undoStack.canUndo).toBe(false);
    const entry = ctx.undoRedo.commitTransaction(session.workingConfig);
    expect(entry).toBeUndefined();
    expect(session.undoStack.canUndo).toBe(false);
    expect(session.workingConfig.symbols.map((n) => n.id)).toEqual(['imported']);
  });
});

// plan 2026-08-08-1809-2 Phase 3 / P1-3：undo/redo 后 selection 修剪到现存 id。
describe('P1-3 — undo/redo prunes stale selection', () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    s.detachAdapter();
    s.engine.destroy();
    s.container.remove();
    vi.restoreAllMocks();
  });

  it('undo an add prunes the removed id from selection + fires onSelectionChange + later remove is clean no-op', () => {
    const { session, mutators, onSelectionChange } = s;
    mutators.addWorkingSymbol({ id: 'foo', type: 'scada-rect', x: 0, y: 0, width: 5, height: 5 });
    mutators.setSelection(['foo']);
    expect(session.selection).toEqual(['foo']);
    onSelectionChange.mockClear();

    mutators.undo(); // inverse of add → removes foo
    // selection must no longer hold the dead id.
    expect(session.selection).not.toContain('foo');
    expect(session.workingConfig.symbols.map((n) => n.id)).not.toContain('foo');
    // onSelectionChange fired with the pruned set.
    expect(onSelectionChange).toHaveBeenCalled();
    const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1]?.[0];
    expect(lastCall).not.toContain('foo');
    // canUndo/canRedo consistent with stack (undo consumed the add entry → canUndo false, canRedo true).
    expect(session.undoStack.canUndo).toBe(false);
    expect(session.undoStack.canRedo).toBe(true);

    // subsequent removeWorkingSymbol on the dead id is a clean no-op (no entry pushed).
    const depthBefore = session.undoStack.undoStackDepth;
    mutators.removeWorkingSymbol('foo');
    expect(session.undoStack.undoStackDepth).toBe(depthBefore);
  });

  it('redo a remove prunes the re-removed id from selection', () => {
    const { session, mutators } = s;
    mutators.addWorkingSymbol({ id: 'foo', type: 'scada-rect', x: 0, y: 0, width: 5, height: 5 });
    mutators.removeWorkingSymbol('foo'); // deselects foo; pushes remove-symbol
    mutators.undo(); // re-adds foo
    expect(session.workingConfig.symbols.map((n) => n.id)).toContain('foo');
    mutators.setSelection(['foo']); // select foo again
    expect(session.selection).toEqual(['foo']);

    mutators.redo(); // re-removes foo → selection must prune
    expect(session.selection).not.toContain('foo');
    expect(session.workingConfig.symbols.map((n) => n.id)).not.toContain('foo');
  });

  it('undo with live selection does not spuriously notify (no stale id → no prune)', () => {
    const { session, mutators, onSelectionChange } = s;
    mutators.addWorkingSymbol({ id: 'foo', type: 'scada-rect', x: 0, y: 0, width: 5, height: 5 });
    mutators.setSelection(['a']); // 'a' survives any undo of the add
    onSelectionChange.mockClear();
    mutators.undo(); // removes foo, 'a' still live → selection unchanged
    expect(session.selection).toEqual(['a']);
  });
});
