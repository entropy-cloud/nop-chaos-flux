import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

const config: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    { id: 'top-1', type: 'scada-rect', x: 0, y: 0, width: 40, height: 40 },
    { id: 'top-2', type: 'scada-rect', x: 100, y: 100, width: 40, height: 40 },
  ],
};

function setup(startMode: 'edit' | 'preview' = 'edit') {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const engine = ScadaEditorEngine.create({ container });
  engine.build(config);
  const session = createScadaEditorSession(config, { mode: startMode });
  if (engine.currentMode !== session.mode) engine.setMode(session.mode);
  const onError = vi.fn<(code: string, message: string) => void>();
  const latest: { current: UseEditorEngineArgs } = {
    current: { containerRef: { current: null }, initialConfig: config, commitPolicy: 'manual', onError },
  };
  const core = createRuntimeCore(engine, session, latest, { current: false });
  if (!core) throw new Error('test setup failed: createRuntimeCore returned null');
  const mutators = buildRuntimeMutators(core.ctx);
  const toolbox = buildToolboxRuntime(core.ctx);
  core.ctx.save = mutators.save;
  return { engine, session, ctx: core.ctx as EditorRuntimeContext, mutators, toolbox, onError, container };
}

describe('plan 531 S2 mutators — addWorkingSymbol resolved id + nudge batch single entry', () => {
  let s: ReturnType<typeof setup>;

  beforeEach(() => {
    s = setup('edit');
  });

  afterEach(() => {
    s.container.remove();
  });

  it('addWorkingSymbol returns the resolved id (collision path renames and returns the unique id)', () => {
    const returned = s.mutators.addWorkingSymbol({ id: 'top-1', type: 'scada-rect', x: 0, y: 0 });
    // resolveUniqueNodeId 约定：剥离 -N 后缀自增（top-1 → top-2 已被 config 占用 → top-3）。
    expect(returned).toBe('top-3');
    const nonColliding = s.mutators.addWorkingSymbol({ id: 'fresh-1', type: 'scada-rect', x: 0, y: 0 });
    expect(nonColliding).toBe('fresh-1');
  });

  it('nudge batch produces ONE undo entry for a multi-node selection (判别性: 旧逐节点实现增量 = N 必挂)', () => {
    const depthBefore = s.session.undoStack.undoStackDepth;
    s.mutators.nudgeWorkingSymbols(['top-1', 'top-2'], 10, -5);
    expect(s.session.undoStack.undoStackDepth).toBe(depthBefore + 1);
    expect(s.session.workingConfig.symbols[0]).toMatchObject({ x: 10, y: -5 });
    expect(s.session.workingConfig.symbols[1]).toMatchObject({ x: 110, y: 95 });
    expect(s.session.undoStack.topOperationKind).toBe('update-symbol');

    // 一次 undo 全恢复（单 diff 语义）。
    s.mutators.undo();
    expect(s.session.workingConfig.symbols[0]).toMatchObject({ x: 0, y: 0 });
    expect(s.session.workingConfig.symbols[1]).toMatchObject({ x: 100, y: 100 });
  });

  it('nudge batch recomputes connection linkages for the moved node (单批内完成)', () => {
    // 连接为归一化锚点格式（{ id, x, y, direction, target }，connection-adapter readConnections 契约）。
    const junctionConfig: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'j1',
          type: 'scada-pipe-junction',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          custom: { connections: [{ id: 'c1', x: 0.9, y: 0.5, direction: 'out', target: 'dev-1' }] },
        },
        { id: 'dev-1', type: 'scada-rect', x: 300, y: 100, width: 80, height: 60 },
      ],
    };
    s.mutators.load(junctionConfig);
    const connBefore = structuredClone(
      (
        s.session.workingConfig.symbols[0] as unknown as {
          custom: { connections: Array<{ x: number; y: number }> };
        }
      ).custom.connections[0],
    );
    const depthBefore = s.session.undoStack.undoStackDepth;
    // 批量移动 target 设备 → 指向它的 junction 连接在批内联动重算（design-connection.md §4.4）。
    s.mutators.nudgeWorkingSymbols(['dev-1'], 100, 0);
    expect(s.session.undoStack.undoStackDepth).toBe(depthBefore + 1);
    const connAfter = (
      s.session.workingConfig.symbols[0] as unknown as {
        custom: { connections: Array<{ x: number; y: number }> };
      }
    ).custom.connections[0];
    expect(connAfter.x !== connBefore.x || connAfter.y !== connBefore.y).toBe(true);
    // 单 undo 同时恢复设备位置与联动值（单 diff 事务语义）。
    s.mutators.undo();
    const connRestored = (
      s.session.workingConfig.symbols[0] as unknown as {
        custom: { connections: Array<{ x: number; y: number }> };
      }
    ).custom.connections[0];
    expect(connRestored).toEqual(connBefore);
  });

  it('nudge batch is a gated no-op in preview mode', () => {
    s.session.mode = 'preview';
    const depthBefore = s.session.undoStack.undoStackDepth;
    const snapshot = structuredClone(s.session.workingConfig);
    s.mutators.nudgeWorkingSymbols(['top-1', 'top-2'], 10, 10);
    expect(s.session.undoStack.undoStackDepth).toBe(depthBefore);
    expect(s.session.workingConfig).toEqual(snapshot);
  });

  it('nudge batch with fully-unknown ids produces no entry (pushOperation 空 diff 不入栈)', () => {
    const depthBefore = s.session.undoStack.undoStackDepth;
    s.mutators.nudgeWorkingSymbols(['ghost-1'], 5, 5);
    // 全未知 → 无节点被 patch → diff 为空 → undo-redo-adapter pushOperation 跳过（hasChanges 门）。
    expect(s.session.undoStack.undoStackDepth).toBe(depthBefore);
  });
});
