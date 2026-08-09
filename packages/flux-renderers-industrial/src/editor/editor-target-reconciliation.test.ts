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

// plan 2026-08-08-1931-4 Phase 1 / Proof：editor.target reconciliation 缺陷的 failing-first 回归测试。
// 三个核心断言面：
//   - P1-2：通用编辑路径（updateWorkingNode → syncWorkingCopy → applyUpdate 重建子树）后 editor.target
//     仍引用被销毁的旧子节点（identity dangle）+ 长度门控跳过 undo 路径的 target 重解析。
//   - P1-3：applyUndoRedoDiff 的 catch 经 engine.build(beforeWorking) 全量重建后，editor.target 仍引用
//     rollback 前被销毁的节点（未对齐到重建后的 registry）。
//   - P1-4：syncWorkingCopy 的 catch 不 engine.build → 半变场景残留 + 后续 no-op syncWorkingCopy
//     diff 为空 → 引擎永不愈合（canvas ↔ data 永久背离）。
// 全部断言引擎层目标 / 场景状态（对象 identity 或 getSymbol(...).node 等价），非 not.toThrow / session.selection 数组。

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

function getEditorTarget(engine: ScadaEditorEngine): unknown {
  const editor = engine.editor as { target?: unknown } | undefined;
  return editor?.target;
}

const groupedChildConfig: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    {
      id: 'grp',
      type: 'scada-group',
      x: 0,
      y: 0,
      children: [
        { id: 'inner-1', type: 'scada-rect', x: 5, y: 5, width: 30, height: 30, fill: '#000000' },
      ],
    },
  ],
};

// P1-2a — common edit path：updateWorkingNode → syncWorkingCopy → applyUpdate 重建子树后
// editor.target 必须引用新 live 节点，而非被销毁的旧引用。
describe('P1-2a — common grouped-child edit path reconciles editor.target', () => {
  let s: Setup;
  beforeEach(() => {
    s = setupWithConfig(groupedChildConfig);
  });
  afterEach(() => {
    s.detachAdapter();
    s.engine.destroy();
    s.container.remove();
    vi.restoreAllMocks();
  });

  it('editor.target is re-resolved to the NEW child node after updateWorkingNode rebuilds subtree', () => {
    const { engine, mutators } = s;
    // 初始选区：选中嵌套子节点 inner-1（同步 engine targets）。
    mutators.setSelection(['inner-1']);
    const liveBefore = engine.getSymbol('inner-1');
    expect(liveBefore).toBeDefined();
    engine.setEditorTargets([liveBefore!.node]);
    const targetBeforeCapture = getEditorTarget(engine);
    expect(targetBeforeCapture).toBe(liveBefore!.node);

    // 通用编辑路径：修改 inner-1.fill → diffScadaConfig 视 grp.children 变化 → patch.children →
    // editor-engine.applyUpdate 重建子树（inner-1 节点对象 identity 变化）。
    mutators.updateWorkingNode('inner-1', { fill: '#aabbcc' });

    // 断言：editor.target 必须引用新 live 节点。
    const liveAfter = engine.getSymbol('inner-1');
    expect(liveAfter, 'inner-1 leaf should remain registered after subtree rebuild').toBeDefined();
    const targetAfter = getEditorTarget(engine);
    // 新 live 节点与编辑前捕获的引用不同（identity 已变）。
    expect(liveAfter!.node).not.toBe(liveBefore!.node);
    // 关键断言：editor.target 已对齐到新节点（不再是销毁前的旧引用）。
    expect(targetAfter).toBe(liveAfter!.node);
    expect(targetAfter).not.toBe(liveBefore!.node);
  });
});

// P1-2b — applyUndoRedoDiff success-path 长度门控移除：选中 id 经历 identity-changing 重建但
// 长度不变时，target 重解析仍须无条件触发。
describe('P1-2b — applyUndoRedoDiff success-path target re-resolution is unconditional (length-gate removed)', () => {
  let s: Setup;
  beforeEach(() => {
    s = setupWithConfig(groupedChildConfig);
  });
  afterEach(() => {
    s.detachAdapter();
    s.engine.destroy();
    s.container.remove();
    vi.restoreAllMocks();
  });

  it('undo with selection-length unchanged still re-resolves editor.target to rebuilt node', () => {
    const { engine, mutators, session } = s;
    // 初始：选中 inner-1（与唯一 id 集等长，长度门控不会触发）。
    mutators.setSelection(['inner-1']);
    const liveBefore = engine.getSymbol('inner-1');
    engine.setEditorTargets([liveBefore!.node]);

    // 编辑 inner-1.fill → update-symbol 入栈（patch.children 路径重建子树，identity 变）。
    mutators.updateWorkingNode('inner-1', { fill: '#ff00ff' });
    // 编辑后 selection 长度仍为 1，但 inner-1 的 live 节点对象已变（重建）。
    expect(session.selection).toEqual(['inner-1']);

    // undo 回到 #000000：applyUndoRedoDiff 成功路径，selection 长度未变（仍 1）→ 旧长度门控
    // 跳过 setEditorTargets 重解析 → editor.target dangle。新实现须无条件重解析。
    // 监视 setEditorTargets 是否被调用（成功路径 + 长度不变）。
    const spy = vi.spyOn(engine, 'setEditorTargets');

    mutators.undo();

    // 长度未变（selection 仍 ['inner-1']）但 target 必须重解析到重建后的 live 节点。
    expect(session.selection).toEqual(['inner-1']);
    expect(spy).toHaveBeenCalled();
    const liveAfterUndo = engine.getSymbol('inner-1');
    expect(liveAfterUndo).toBeDefined();
    expect(getEditorTarget(engine)).toBe(liveAfterUndo!.node);
  });
});

// P1-3 — applyUndoRedoDiff catch 经 engine.build(beforeWorking) 全量重建后，
// editor.target 必须对齐到重建后的 live registry（或清空），而非继续引用 rollback 前的旧节点。
describe('P1-3 — applyUndoRedoDiff catch reconciles editor.target after engine.build(beforeWorking)', () => {
  let s: Setup;
  beforeEach(() => {
    s = setupWithConfig(groupedChildConfig);
  });
  afterEach(() => {
    s.detachAdapter();
    s.engine.destroy();
    s.container.remove();
    vi.restoreAllMocks();
  });

  it('engine.applyDiff throws mid-way during undo → catch rebuilds + editor.target reconciled to live node', () => {
    const { engine, mutators, session } = s;
    // 栈序：update inner-1.fill（entry-1，patch.children 重建子树）。working = [grp[inner-1 fill:#ff00ff]]。
    mutators.updateWorkingNode('inner-1', { fill: '#ff00ff' });
    // 选中 inner-1（同步 engine targets 到当前 live 节点）。
    mutators.setSelection(['inner-1']);
    const liveBeforeUndo = engine.getSymbol('inner-1');
    engine.setEditorTargets([liveBeforeUndo!.node]);
    expect(getEditorTarget(engine)).toBe(liveBeforeUndo!.node);
    const preCatchTarget = liveBeforeUndo!.node;

    // undo 时 engine.applyDiff 半途抛错（模拟 remove→build→update 链中段失败：scene-graph 已半变）。
    // mock 先按 diff.added 把节点注册进 registry（scene-graph 半变），再抛——精确再现 applyDiff
    // 无内部回滚、半途抛错时场景树已半变的缺陷。
    vi.spyOn(engine, 'applyDiff').mockImplementationOnce(() => {
      engine.registry.add({ id: 'inner-1', node: {} as never, parentId: 'grp' });
      throw new Error('boom: simulated mid-apply failure');
    });

    mutators.undo(); // catch 触发 → engine.build(beforeWorking) 全量重建

    // 1) working copy 回滚到 beforeWorking（pre-undo 态 = #ff00ff，即 undo 入口态）。
    const inner = session.workingConfig.symbols[0].children![0];
    expect(inner.fill).toBe('#ff00ff');
    // 2) engine registry 已重建到 beforeWorking：inner-1 leaf 存在且是新对象（identity 已变）。
    const liveAfterCatch = engine.getSymbol('inner-1');
    expect(liveAfterCatch, 'inner-1 leaf should be present after rebuild').toBeDefined();
    expect(liveAfterCatch!.node).not.toBe(preCatchTarget);
    // 3) 关键断言：editor.target 已对齐到重建后的 live 节点（不再引用 rollback 前销毁的旧节点）。
    expect(getEditorTarget(engine)).toBe(liveAfterCatch!.node);
    expect(getEditorTarget(engine)).not.toBe(preCatchTarget);
    // 4) 错误派发可见。
    expect(s.onError).toHaveBeenCalledWith('editor-internal-error', expect.any(String));
  });
});

// P1-4 — syncWorkingCopy catch 不 engine.build → 半变场景残留 + 后续 no-op syncWorkingCopy
// diff 为空 → 引擎永不愈合。新实现须 backport 1910-2 全量重建模式。
describe('P1-4 — syncWorkingCopy catch backports engine.build(synced.config) + reconciles target', () => {
  let s: Setup;
  beforeEach(() => {
    s = setupWithConfig(groupedChildConfig);
  });
  afterEach(() => {
    s.detachAdapter();
    s.engine.destroy();
    s.container.remove();
    vi.restoreAllMocks();
  });

  it('engine.applyDiff throws mid-way inside syncWorkingCopy → catch rebuilds scene to synced.config (no half-mutated residue)', () => {
    const { engine, mutators, session, ctx } = s;
    // 选中 inner-1（同步 engine targets）。
    mutators.setSelection(['inner-1']);
    const liveBefore = engine.getSymbol('inner-1');
    engine.setEditorTargets([liveBefore!.node]);

    // 让下一次 engine.applyDiff 半途抛错（syncWorkingCopy 的 try 块内）。
    // mock 先按 diff.added 把节点注册进 registry（scene-graph 半变），再抛——精确再现
    // applyDiff 无内部回滚、半途抛错时场景树已半变的缺陷。syncWorkingCopy 是 catch 监视的
    // 唯一 applyDiff 调用点（updateWorkingNode → syncWorkingCopy）。
    vi.spyOn(engine, 'applyDiff').mockImplementationOnce(() => {
      engine.registry.add({ id: 'phantom-half', node: {} as never, parentId: undefined });
      throw new Error('boom: simulated mid-apply failure inside syncWorkingCopy');
    });

    // 触发 syncWorkingCopy（updateWorkingNode 路径）。
    mutators.updateWorkingNode('inner-1', { fill: '#aabbcc' });

    // 1) 半变残留必须清除：engine registry 不含 phantom-half（catch 已 engine.build 重建）。
    expect(engine.getSymbol('phantom-half')).toBeUndefined();
    // 2) 引擎场景已重建到 synced.config（pre-call 已知良好态）：inner-1 节点对象 identity 是
    //    重建后的新对象，fill 回到 #000000（synced.config 未变）。
    const liveAfterCatch = engine.getSymbol('inner-1');
    expect(liveAfterCatch, 'inner-1 leaf should be present after rebuild').toBeDefined();
    expect(liveAfterCatch!.node.get('fill')).toBe('#000000');
    // 3) working copy 已还原到 synced.config（fill 回到 #000000）。
    const inner = session.workingConfig.symbols[0].children![0];
    expect(inner.fill).toBe('#000000');
    // 4) synced.config 与 working copy 对齐（下轮 syncWorkingCopy diff 为空，但场景已对齐 → 无背离）。
    expect(ctx.synced.config.symbols[0].children![0].fill).toBe('#000000');
    // 5) onError 派发 editor-internal-error。
    expect(s.onError).toHaveBeenCalledWith('editor-internal-error', expect.any(String));

    // 6) 关键回归断言：后续 no-op syncWorkingCopy 不留下 diverged canvas。
    //    场景已对齐 synced.config，working copy 也已还原 → diff 为空 → 引擎保持对齐态。
    const liveBeforeNoop = engine.getSymbol('inner-1')!.node;
    mutators.updateWorkingNode('inner-1', { fill: '#000000' }); // 与 synced.config 同值 → no-op diff
    expect(engine.getSymbol('inner-1')!.node).toBe(liveBeforeNoop); // 未重建（无 diff）；live 节点不变
  });

  it('syncWorkingCopy catch reconciles editor.target to live node after rebuild', () => {
    const { engine, mutators } = s;
    mutators.setSelection(['inner-1']);
    const liveBefore = engine.getSymbol('inner-1');
    engine.setEditorTargets([liveBefore!.node]);
    expect(getEditorTarget(engine)).toBe(liveBefore!.node);

    vi.spyOn(engine, 'applyDiff').mockImplementationOnce(() => {
      throw new Error('boom: simulated mid-apply failure inside syncWorkingCopy');
    });

    mutators.updateWorkingNode('inner-1', { fill: '#aabbcc' });

    // catch 经 engine.build(synced.config) 重建 → editor.target 须对齐到新 live 节点。
    const liveAfterCatch = engine.getSymbol('inner-1');
    expect(liveAfterCatch).toBeDefined();
    expect(getEditorTarget(engine)).toBe(liveAfterCatch!.node);
    expect(getEditorTarget(engine)).not.toBe(liveBefore!.node);
  });
});
