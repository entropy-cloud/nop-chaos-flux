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
  symbols: [{ id: 'top-1', type: 'scada-rect', x: 0, y: 0, width: 40, height: 40 }],
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

describe('runtime mutators — programmatic-channel preview gating (R5)', () => {
  let s: ReturnType<typeof setup>;
  let workingSnapshot: ScadaConfig;

  beforeEach(() => {
    s = setup('preview');
    workingSnapshot = structuredClone(s.session.workingConfig);
  });

  afterEach(() => {
    s.container.remove();
  });

  it('writeConnection is a gated no-op in preview (even for unknown junction ids)', () => {
    const spy = vi.spyOn(s.ctx.engine, 'applyDiff');
    s.mutators.writeConnection('top-1', []);
    s.mutators.writeConnection('ghost', []);
    expect(spy).not.toHaveBeenCalled();
    expect(s.session.workingConfig).toEqual(workingSnapshot);
    expect(s.session.undoStack.canUndo).toBe(false);
  });

  it('writeConnection is a no-op when the junction id matches no working-copy node', () => {
    s.session.mode = 'edit';
    const spy = vi.spyOn(s.ctx.engine, 'applyDiff');
    s.mutators.writeConnection('ghost', []);
    expect(spy).not.toHaveBeenCalled();
    expect(s.session.undoStack.canUndo).toBe(false);
  });

  it('undo/redo are gated no-ops in preview', () => {
    // 预置一个可撤销条目（edit 态写入），再切回 preview 验证门控。
    s.session.mode = 'edit';
    s.mutators.updateWorkingNode('top-1', { fill: '#123456' });
    expect(s.session.undoStack.canUndo).toBe(true);
    s.session.mode = 'preview';
    const before = structuredClone(s.session.workingConfig);
    s.mutators.undo();
    s.mutators.redo();
    expect(s.session.workingConfig).toEqual(before);
  });

  it('group/ungroup and remove are gated no-ops in preview; empty id arrays stay no-ops', () => {
    const before = structuredClone(s.session.workingConfig);
    s.mutators.removeWorkingSymbol('top-1');
    s.mutators.removeWorkingSymbol([]);
    s.mutators.groupSymbols(['top-1']);
    s.mutators.ungroupSymbols('top-1');
    s.mutators.ungroupSymbols([]);
    expect(s.session.workingConfig).toEqual(before);
    expect(s.session.undoStack.canUndo).toBe(false);
  });

  it('groupSymbols with dead ids is a silent no-op (no undo entry)', () => {
    s.session.mode = 'edit';
    s.mutators.groupSymbols(['ghost-id']);
    expect(s.session.workingConfig.symbols.map((n) => n.id)).toEqual(['top-1']);
    expect(s.session.undoStack.canUndo).toBe(false);
  });
});

describe('runtime mutators — mode/load boundaries', () => {
  afterEach(() => {
    document.querySelector('[data-scada-test-container]')?.remove();
  });

  it('switchMode to the current mode is an early no-op (engine.setMode untouched)', () => {
    const s = setup('edit');
    const setModeSpy = vi.spyOn(s.engine, 'setMode');
    s.mutators.switchMode('edit');
    expect(setModeSpy).not.toHaveBeenCalled();
    s.container.remove();
  });

  it('load rebuilds and re-syncs engine mode to session mode when loading in preview', () => {
    const s = setup('preview');
    s.mutators.load({ ...config, symbols: [{ id: 'next', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }] });
    expect(s.session.workingConfig.symbols[0].id).toBe('next');
    // resetSession 把 session.mode 重置回 edit；重建后 engine.mode 被校正对齐 session.mode（不脱钩）。
    expect(s.session.mode).toBe('edit');
    expect(s.engine.currentMode).toBe('edit');
    s.container.remove();
  });
});
