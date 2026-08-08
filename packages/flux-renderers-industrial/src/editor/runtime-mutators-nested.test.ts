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
  initialConfig: ScadaConfig,
): { current: UseEditorEngineArgs } {
  return {
    current: {
      containerRef: { current: null },
      initialConfig,
      commitPolicy: 'manual',
      onError,
      onSelectionChange,
    },
  };
}

function setupWithConfig(config: ScadaConfig): Setup {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const engine = ScadaEditorEngine.create({ container });
  engine.build(config);
  const session = createScadaEditorSession(config);
  const onError = vi.fn<(code: string, message: string) => void>();
  const onSelectionChange = vi.fn<(nodeIds: string[]) => void>();
  const latest = makeLatest(onError, onSelectionChange, config);
  const core = createRuntimeCore(engine, session, latest, { current: false });
  if (!core) throw new Error('test setup failed: createRuntimeCore returned null');
  const mutators = buildRuntimeMutators(core.ctx);
  const toolbox = buildToolboxRuntime(core.ctx);
  core.ctx.save = mutators.save;
  return {
    engine,
    session,
    ctx: core.ctx,
    mutators,
    toolbox,
    latest,
    onSelectionChange,
    onError,
    container,
    detachAdapter: core.detachAdapter,
  };
}

const nestedConfig: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    { id: 'top-1', type: 'scada-rect', x: 0, y: 0, width: 40, height: 40 },
    {
      id: 'outer',
      type: 'scada-group',
      children: [
        { id: 'inner-1', type: 'scada-rect', x: 10, y: 10, width: 20, height: 20, fill: '#000000' },
        { id: 'inner-2', type: 'scada-ellipse', x: 40, y: 40, width: 30, height: 30 },
      ],
    },
  ],
};

const nestedGroupConfig: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    {
      id: 'outer',
      type: 'scada-group',
      children: [
        {
          id: 'inner-group',
          type: 'scada-group',
          children: [
            { id: 'deep-1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 },
            { id: 'deep-2', type: 'scada-ellipse', x: 20, y: 20, width: 10, height: 10 },
          ],
        },
      ],
    },
  ],
};

// plan 2026-08-08-1809-3 Phase 2 / P1-4：结构 mutator 嵌套解析。
// 旧实现 removeWorkingSymbol/groupSymbols/ungroupSymbols 仅操作顶层 symbols，
// 选中嵌套图元后 Delete/Group/Ungroup 静默 no-op（与解析嵌套 id 的 selectionNodes 不对称）。
describe('P1-4 — removeWorkingSymbol resolves nested child (CV-delete-nested)', () => {
  let s: Setup;
  beforeEach(() => {
    s = setupWithConfig(nestedConfig);
  });
  afterEach(() => {
    s.detachAdapter();
    s.engine.destroy();
    s.container.remove();
    vi.restoreAllMocks();
  });

  it('delete a nested child detaches from parent.children + engine tree drops + non-empty undo entry', () => {
    const { session, mutators, engine } = s;
    mutators.setSelection(['inner-1']);
    expect(session.selection).toEqual(['inner-1']);
    const depthBefore = session.undoStack.undoStackDepth;

    mutators.removeWorkingSymbol('inner-1');

    // working copy: inner-1 detached from outer.children; outer + inner-2 + top-1 preserved.
    const outer = session.workingConfig.symbols.find((n) => n.id === 'outer');
    expect(outer?.children?.map((c) => c.id)).toEqual(['inner-2']);
    expect(session.workingConfig.symbols.find((n) => n.id === 'top-1')).toBeDefined();
    // selection pruned (inner-1 deselected).
    expect(session.selection).not.toContain('inner-1');
    // canvas layer: engine registry no longer holds inner-1.
    expect(engine.getSymbol('inner-1')).toBeUndefined();
    // non-empty undo entry pushed.
    expect(session.undoStack.undoStackDepth).toBe(depthBefore + 1);
  });

  it('undo restores the nested child to its parent + canvas tree', () => {
    const { session, mutators, engine } = s;
    mutators.setSelection(['inner-1']);
    mutators.removeWorkingSymbol('inner-1');
    expect(engine.getSymbol('inner-1')).toBeUndefined();

    mutators.undo();

    const outer = session.workingConfig.symbols.find((n) => n.id === 'outer');
    expect(outer?.children?.map((c) => c.id).sort()).toEqual(['inner-1', 'inner-2']);
    expect(engine.getSymbol('inner-1')).toBeDefined();
  });

  it('delete a top-level node still works (regression guard)', () => {
    const { session, mutators, engine } = s;
    mutators.setSelection(['top-1']);
    mutators.removeWorkingSymbol('top-1');
    expect(session.workingConfig.symbols.find((n) => n.id === 'top-1')).toBeUndefined();
    expect(engine.getSymbol('top-1')).toBeUndefined();
  });
});

describe('P1-4 — groupSymbols with mixed top-level + nested selection (CV-group-mixed)', () => {
  let s: Setup;
  beforeEach(() => {
    s = setupWithConfig(nestedConfig);
  });
  afterEach(() => {
    s.detachAdapter();
    s.engine.destroy();
    s.container.remove();
    vi.restoreAllMocks();
  });

  it('mixed selection (top-1 + inner-1) groups all into a new group; no item dropped', () => {
    const { session, mutators, engine } = s;
    mutators.setSelection(['top-1', 'inner-1']);

    mutators.groupSymbols(['top-1', 'inner-1']);

    const newGroup = session.workingConfig.symbols.find((n) => n.type === 'scada-group' && n.id !== 'outer');
    expect(newGroup, 'a new group should be created').toBeDefined();
    // The new group should hold both selected nodes (mixed nesting flattened in).
    expect(newGroup!.children?.map((c) => c.id).sort()).toEqual(['inner-1', 'top-1']);
    // top-1 removed from top-level; inner-1 removed from outer.children.
    expect(session.workingConfig.symbols.find((n) => n.id === 'top-1')).toBeUndefined();
    const outer = session.workingConfig.symbols.find((n) => n.id === 'outer');
    expect(outer?.children?.map((c) => c.id)).toEqual(['inner-2']);
    // canvas layer: new group registered; both children re-parented under it.
    expect(engine.getSymbol(newGroup!.id)).toBeDefined();
    const newGroupLeaf = engine.getSymbol(newGroup!.id);
    const newGroupParent = (newGroupLeaf as unknown as { parentId?: string }).parentId;
    expect(newGroupParent, 'new group is top-level (no parent)').toBeUndefined();
    // selection collapsed to the new group.
    expect(session.selection).toEqual([newGroup!.id]);
  });

  it('group of two nested children (inside the same parent) flattens into a new top-level group', () => {
    const { session, mutators } = s;
    mutators.setSelection(['inner-1', 'inner-2']);
    mutators.groupSymbols(['inner-1', 'inner-2']);
    const newGroup = session.workingConfig.symbols.find((n) => n.type === 'scada-group' && n.id !== 'outer');
    expect(newGroup).toBeDefined();
    expect(newGroup!.children?.map((c) => c.id).sort()).toEqual(['inner-1', 'inner-2']);
    // outer should no longer hold the grouped children.
    const outer = session.workingConfig.symbols.find((n) => n.id === 'outer');
    expect(outer?.children ?? []).toHaveLength(0);
  });
});

describe('P1-4 — ungroupSymbols resolves nested group (CV-ungroup-nested)', () => {
  let s: Setup;
  beforeEach(() => {
    s = setupWithConfig(nestedGroupConfig);
  });
  afterEach(() => {
    s.detachAdapter();
    s.engine.destroy();
    s.container.remove();
    vi.restoreAllMocks();
  });

  it('ungroup a nested group recursively finds + dissolves it (children promoted into parent)', () => {
    const { session, mutators, engine } = s;
    // baseline: outer contains inner-group which contains deep-1/deep-2.
    expect(engine.getSymbol('inner-group')).toBeDefined();

    mutators.ungroupSymbols('inner-group');

    // inner-group dissolved; deep-1/deep-2 promoted into outer.children.
    expect(session.workingConfig.symbols.find((n) => n.id === 'inner-group')).toBeUndefined();
    const outer = session.workingConfig.symbols.find((n) => n.id === 'outer');
    expect(outer?.children?.map((c) => c.id).sort()).toEqual(['deep-1', 'deep-2']);
    // canvas layer: inner-group leaf removed; deep-1/deep-2 re-parented under outer.
    expect(engine.getSymbol('inner-group')).toBeUndefined();
    expect(engine.getSymbol('deep-1')?.parentId).toBe('outer');
    // selection collapsed to the promoted children.
    expect(session.selection.sort()).toEqual(['deep-1', 'deep-2']);
  });

  it('ungroup a top-level group still works (regression guard)', () => {
    const { session, mutators } = s;
    // Build a top-level group via groupSymbols first, then ungroup it.
    mutators.load({
      version: 1,
      variables: [],
      symbols: [
        { id: 'r1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 },
        { id: 'r2', type: 'scada-rect', x: 20, y: 20, width: 10, height: 10 },
      ],
    });
    mutators.groupSymbols(['r1', 'r2']);
    const groupNode = session.workingConfig.symbols.find((n) => n.type === 'scada-group')!;
    mutators.ungroupSymbols(groupNode.id);
    expect(session.workingConfig.symbols.find((n) => n.id === groupNode.id)).toBeUndefined();
    expect(session.workingConfig.symbols.map((n) => n.id).sort()).toEqual(['r1', 'r2']);
  });
});
