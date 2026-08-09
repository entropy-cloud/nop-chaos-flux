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
    const { session, mutators, engine, onSelectionChange } = s;
    mutators.addWorkingSymbol({ id: 'foo', type: 'scada-rect', x: 0, y: 0, width: 5, height: 5 });
    mutators.setSelection(['foo']);
    expect(session.selection).toEqual(['foo']);
    onSelectionChange.mockClear();
    // plan 2026-08-09-1300-1 Phase 3 / 1931-P2-7：监视引擎层 target 再同步——undo 后 selection 为空
    // → reconcileEditorTargets 应触发 engine.clearEditorSelection（旧实现只断言 session.selection，
    // 引擎层 leafer editor 可能仍高亮死节点而对测试不可见）。
    const clearSpy = vi.spyOn(engine, 'clearEditorSelection');

    mutators.undo(); // inverse of add → removes foo
    // selection must no longer hold the dead id.
    expect(session.selection).not.toContain('foo');
    expect(session.workingConfig.symbols.map((n) => n.id)).not.toContain('foo');
    // onSelectionChange fired with the pruned set.
    expect(onSelectionChange).toHaveBeenCalled();
    const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1]?.[0];
    expect(lastCall).not.toContain('foo');
    // 引擎层 target 再同步：foo 死节点已从 editor.target 清除（leafer editor 不再保留死高亮框）。
    expect(clearSpy).toHaveBeenCalled();
    // canUndo/canRedo consistent with stack (undo consumed the add entry → canUndo false, canRedo true).
    expect(session.undoStack.canUndo).toBe(false);
    expect(session.undoStack.canRedo).toBe(true);

    // subsequent removeWorkingSymbol on the dead id is a clean no-op (no entry pushed).
    const depthBefore = session.undoStack.undoStackDepth;
    mutators.removeWorkingSymbol('foo');
    expect(session.undoStack.undoStackDepth).toBe(depthBefore);
  });

  it('redo a remove prunes the re-removed id from selection', () => {
    const { session, mutators, engine } = s;
    mutators.addWorkingSymbol({ id: 'foo', type: 'scada-rect', x: 0, y: 0, width: 5, height: 5 });
    mutators.removeWorkingSymbol('foo'); // deselects foo; pushes remove-symbol
    mutators.undo(); // re-adds foo
    expect(session.workingConfig.symbols.map((n) => n.id)).toContain('foo');
    mutators.setSelection(['foo']); // select foo again
    expect(session.selection).toEqual(['foo']);
    // plan 2026-08-09-1300-1 Phase 3 / 1931-P2-7：监视引擎层 target 再同步——redo 后 selection 为空
    // → reconcileEditorTargets 应触发 engine.clearEditorSelection。
    const clearSpy = vi.spyOn(engine, 'clearEditorSelection');

    mutators.redo(); // re-removes foo → selection must prune
    expect(session.selection).not.toContain('foo');
    expect(session.workingConfig.symbols.map((n) => n.id)).not.toContain('foo');
    // 引擎层 target 再同步：leafer editor 不再高亮已重删的 foo 死节点。
    expect(clearSpy).toHaveBeenCalled();
  });

  it('undo with live selection does not spuriously notify (no stale id → no prune)', () => {
    const { session, mutators, engine, onSelectionChange } = s;
    mutators.addWorkingSymbol({ id: 'foo', type: 'scada-rect', x: 0, y: 0, width: 5, height: 5 });
    mutators.setSelection(['a']); // 'a' survives any undo of the add
    onSelectionChange.mockClear();
    // plan 2026-08-09-1300-1 Phase 3 / 1931-P2-7：监视引擎层 target 再同步——selection 长度未变（仍 ['a']）
    // 但 applyUndoRedoDiff 重建子树使 LeafNode identity 可能变；reconcileEditorTargets 无条件重解析
    // → setEditorTargets 被调用（防 editor.target dangle 在被销毁的旧节点，长度门控会漏掉此分支）。
    const setTargetsSpy = vi.spyOn(engine, 'setEditorTargets');
    mutators.undo(); // removes foo, 'a' still live → selection unchanged
    expect(session.selection).toEqual(['a']);
    // 引擎层 target 无条件重解析：setEditorTargets 以 live 'a' 节点触发（即便 selection 长度未变）。
    expect(setTargetsSpy).toHaveBeenCalled();
  });
});

// plan 2026-08-08-1910-2 Phase 2 / A6：applyUndoRedoDiff 的 engine.applyDiff 半途抛错时引擎场景回滚。
// 旧实现 catch 仅回滚 working copy，不回滚 engine（leafer 无事务，applyDiff remove→build→update→reorder
// 半途抛错时场景树已半变）+ 不回滚 synced.config → 若 synced.config===beforeWorking，下轮 syncWorkingCopy
// diff 为空 → 引擎永不愈合，画布与 working copy/栈永久背离。
describe('A6 — applyUndoRedoDiff engine rollback on applyDiff throw', () => {
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

  it('engine.applyDiff throws → engine rebuilt to beforeWorking + synced.config aligned (no permanent divergence)', () => {
    const { session, mutators, engine, ctx, onError } = s;
    // 栈序：add foo（entry-1）→ remove foo（entry-2，栈顶）。working = [a]。
    mutators.addWorkingSymbol({ id: 'foo', type: 'scada-rect', x: 0, y: 0, width: 5, height: 5 });
    mutators.removeWorkingSymbol('foo');
    expect(session.workingConfig.symbols.map((n) => n.id)).toEqual(['a']);
    const beforeUndoIds = session.workingConfig.symbols.map((n) => n.id);

    // 让下一次 engine.applyDiff 半途抛错（模拟 remove→build→update 链中段失败：leafer scene 已半变）。
    // mock 先按 diff.added 把节点注册进 registry（scene-graph 半变），再抛——精确再现 applyDiff
    // 无内部回滚、半途抛错时场景树已半变的缺陷。undo() → applyUndoRedoDiff → engine.applyDiff 是
    // catch 监视的唯一 applyDiff 调用。
    vi.spyOn(engine, 'applyDiff').mockImplementationOnce(() => {
      engine.registry.add({ id: 'foo', node: {} as never, parentId: undefined });
      throw new Error('boom: simulated mid-apply failure');
    });

    mutators.undo(); // inverse of remove → re-add foo → engine.applyDiff 半途抛错 → catch

    // 1) working copy 回滚到 beforeUndo（foo 不在）。
    expect(session.workingConfig.symbols.map((n) => n.id)).toEqual(beforeUndoIds);
    // 2) 引擎场景回滚到 beforeUndo：engine registry 不含 foo（半变残留已重建清除）。
    expect(engine.getSymbol('foo')).toBeUndefined();
    expect(engine.getSymbol('a')).toBeDefined();
    // 3) synced.config 与 working copy 对齐 → 下轮 syncWorkingCopy diff 为空（不永久背离）。
    expect(ctx.synced.config.symbols.map((n) => n.id)).toEqual(beforeUndoIds);
    // 4) onError 派发 editor-internal-error（host 可见）。
    expect(onError).toHaveBeenCalledWith('editor-internal-error', expect.any(String));
  });
});

// plan 2026-08-08-1910-2 Phase 4 / A8：删除被连线的设备节点时 prune 其它 junction 上
// target===被删id 的 connection 声明。旧实现 removeWorkingSymbol/cutSelection 仅 filter 节点，
// 不扫其它 junction 的 connection.target → 保存后成永久 dangling 数据污染。
describe('A8 — removeWorkingSymbol / cutSelection prune dangling connection declarations', () => {
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

  function loadWiredConfig(): void {
    s.mutators.load({
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'J',
          type: 'scada-pipe-junction',
          x: 0,
          y: 0,
          width: 50,
          height: 50,
          custom: {
            connections: [
              { id: 'J-conn-0', x: 0.5, y: 0, direction: 'out', target: 'dev-1' },
              { id: 'J-conn-1', x: 0, y: 0.5, direction: 'out', target: 'dev-2' },
            ],
          },
        },
        { id: 'dev-1', type: 'scada-rect', x: 200, y: 100, width: 60, height: 60 },
        { id: 'dev-2', type: 'scada-rect', x: 400, y: 100, width: 60, height: 60 },
      ],
    });
  }

  function junctionConnections(): Array<{ id: string; target: string }> {
    const j = s.session.workingConfig.symbols.find((n) => n.id === 'J')!;
    return (j.custom as { connections: Array<{ id: string; target: string }> }).connections;
  }

  it('removeWorkingSymbol(pruned dev) drops connection declarations targeting it; sibling connection kept', () => {
    loadWiredConfig();
    s.mutators.removeWorkingSymbol('dev-1');
    const conns = junctionConnections();
    // target===dev-1 的 connection 已 prune。
    expect(conns.find((c) => c.target === 'dev-1')).toBeUndefined();
    // 指向 dev-2 的 sibling connection 保留。
    expect(conns.find((c) => c.target === 'dev-2')).toBeDefined();
    expect(conns.map((c) => c.target)).toEqual(['dev-2']);
  });

  it('undo after removeWorkingSymbol restores the pruned connection (snapshot-based)', () => {
    loadWiredConfig();
    s.mutators.removeWorkingSymbol('dev-1');
    expect(junctionConnections().map((c) => c.target)).toEqual(['dev-2']);
    s.mutators.undo();
    // undo 经 prevSnapshot 恢复 → 两条 connection 全部回来。
    const targets = junctionConnections().map((c) => c.target).sort();
    expect(targets).toEqual(['dev-1', 'dev-2']);
    // dev-1 节点也恢复。
    expect(s.session.workingConfig.symbols.find((n) => n.id === 'dev-1')).toBeDefined();
  });

  it('cutSelection prunes dangling connection declarations; undo restores them', () => {
    loadWiredConfig();
    s.mutators.setSelection(['dev-1']);
    s.toolbox.cutSelection();
    const conns = junctionConnections();
    expect(conns.find((c) => c.target === 'dev-1')).toBeUndefined();
    expect(conns.map((c) => c.target)).toEqual(['dev-2']);
    // undo 恢复 pruned connection + 被剪节点。
    s.mutators.undo();
    const targets = junctionConnections().map((c) => c.target).sort();
    expect(targets).toEqual(['dev-1', 'dev-2']);
    expect(s.session.workingConfig.symbols.find((n) => n.id === 'dev-1')).toBeDefined();
  });
});
