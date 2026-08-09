import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { ScadaEditorEngine } from './renderer/editor-engine.js';
import { createRuntimeCore, type EditorRuntimeContext, type UseEditorEngineArgs } from './runtime-factories.js';
import { buildRuntimeMutators } from './runtime-mutators.js';
import { buildToolboxRuntime } from './toolbox-runtime.js';
import { createScadaEditorSession } from './editor-session.js';
import { collectAllSymbols } from './editor-working-helpers.js';
import { parseScadaConfig } from '../serialization/parse.js';
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

// plan 2026-08-09-1300-1 Phase 1 / 1931-P2-1：groupSymbols 祖先+后代同选去重（数据完整性）。
// 旧实现 groupNode.children = selectedNodes.map((c) => ({ ...c })) 浅克隆——当选 [G1, G2] 且 G2 ⊂ G1.children
// 时，G2 同时作为 G1.children 的内层节点（经 G1 的 ...c 带入）+ groupNode.children 的顶层节点出现 → 重复 id
// （collectAllSymbols 与序列化输出均含两份 G2）。修复：构造 children 前剔除「是另一选中节点后代」的选中节点，
// 后代保留在其选中祖先的子树内。
const ancestorDescendantConfig: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    { id: 'sibling', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 },
    {
      id: 'G1',
      type: 'scada-group',
      children: [
        { id: 'G2', type: 'scada-rect', x: 5, y: 5, width: 10, height: 10 },
        { id: 'G3', type: 'scada-ellipse', x: 25, y: 25, width: 10, height: 10 },
      ],
    },
  ],
};

describe('P2-1 — groupSymbols ancestor+descendant selection dedup (no duplicate id)', () => {
  let s: Setup;
  beforeEach(() => {
    s = setupWithConfig(ancestorDescendantConfig);
  });
  afterEach(() => {
    s.detachAdapter();
    s.engine.destroy();
    s.container.remove();
    vi.restoreAllMocks();
  });

  it('grouping [G1, G2] (G2 ⊂ G1.children) yields zero duplicate ids across working copy + serialized output', () => {
    const { session, mutators } = s;

    mutators.groupSymbols(['G1', 'G2']);

    // (b) collectAllSymbols(result) has no duplicate id.
    const allIds = collectAllSymbols(session.workingConfig.symbols).map((n) => n.id);
    expect(allIds.length, `ids should be unique, got: ${allIds.join(',')}`).toBe(new Set(allIds).size);

    // (a) serialized output round-trips without duplicate id.
    const serialized = mutators.save();
    const reparsed = parseScadaConfig(serialized);
    const reparsedIds = collectAllSymbols(reparsed.symbols).map((n) => n.id);
    expect(reparsedIds.length).toBe(new Set(reparsedIds).size);

    // (c) the new group's direct children hold G1 (with G2 still nested inside) and NOT G2 as a sibling.
    const newGroup = session.workingConfig.symbols.find(
      (n) => n.type === 'scada-group' && n.id.startsWith('scada-group'),
    );
    expect(newGroup, 'a new group should be created').toBeDefined();
    const directChildIds = newGroup!.children?.map((c) => c.id) ?? [];
    expect(directChildIds).toContain('G1');
    expect(directChildIds, 'G2 must NOT be a direct child of the new group (stays nested in G1)').not.toContain('G2');

    // G2 still exists (nested inside G1 inside the new group), G1 retains its original children.
    expect(allIds).toContain('G2');
    const g1 = newGroup!.children?.find((c) => c.id === 'G1');
    expect(g1?.children?.map((c) => c.id).sort()).toEqual(['G2', 'G3']);
  });

  it('grouping [G1, G2, sibling] (mixed ancestor + descendant + sibling) keeps each id once', () => {
    const { session, mutators } = s;

    mutators.groupSymbols(['G1', 'G2', 'sibling']);

    const allIds = collectAllSymbols(session.workingConfig.symbols).map((n) => n.id);
    expect(allIds.length).toBe(new Set(allIds).size);
    // sibling + G1 are top-level children of new group; G2 nested in G1.
    const newGroup = session.workingConfig.symbols.find(
      (n) => n.type === 'scada-group' && n.id.startsWith('scada-group'),
    )!;
    const directChildIds = newGroup.children?.map((c) => c.id).sort() ?? [];
    expect(directChildIds).toEqual(['G1', 'sibling']);
  });

  it('regression — grouping sibling top-level nodes (no nesting overlap) still works', () => {
    const { session, mutators } = s;

    mutators.groupSymbols(['sibling', 'G1']);

    const allIds = collectAllSymbols(session.workingConfig.symbols).map((n) => n.id);
    expect(allIds.length).toBe(new Set(allIds).size);
    const newGroup = session.workingConfig.symbols.find(
      (n) => n.type === 'scada-group' && n.id.startsWith('scada-group'),
    )!;
    // both selected top-level nodes become direct children of the new group; G1's subtree (G2/G3) stays nested.
    expect(newGroup.children?.map((c) => c.id).sort()).toEqual(['G1', 'sibling']);
    expect(allIds).toContain('G2');
    expect(allIds).toContain('G3');
  });
});
