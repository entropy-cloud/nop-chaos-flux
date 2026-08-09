import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { ScadaEditorEngine } from './renderer/editor-engine.js';
import { createRuntimeCore, type EditorRuntimeContext } from './runtime-factories.js';
import { buildRuntimeMutators } from './runtime-mutators.js';
import { createScadaEditorSession } from './editor-session.js';
import type { ScadaConfig } from '../serialization/config-types.js';
import type { UseEditorEngineArgs } from './runtime-factories.js';

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
  onError: Mock<(code: string, message: string) => void>;
  container: HTMLDivElement;
  detachAdapter: () => void;
}

function makeLatest(onError: Mock<(code: string, message: string) => void>): { current: UseEditorEngineArgs } {
  return {
    current: {
      containerRef: { current: null },
      initialConfig: baseConfig,
      commitPolicy: 'manual',
      onError,
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
  const latest = makeLatest(onError);
  const core = createRuntimeCore(engine, session, latest, { current: false });
  if (!core) throw new Error('test setup failed: createRuntimeCore returned null');
  const mutators = buildRuntimeMutators(core.ctx);
  core.ctx.save = mutators.save;
  return { engine, session, ctx: core.ctx, mutators, onError, container, detachAdapter: core.detachAdapter };
}

describe('runtime error propagation — applyDiff failure (plan 2026-08-08-0900-1 Phase 2 / P2 #17)', () => {
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

  it('mutator applyDiff failure rolls back working copy + pops just-pushed undo entry + dispatches editor-internal-error', () => {
    const { engine, session, mutators, onError } = s;
    const beforeDepth = session.undoStack.undoStackDepth;
    const beforeCount = session.workingConfig.symbols.length;

    vi.spyOn(engine, 'applyDiff').mockImplementation(() => {
      throw new Error('apply boom');
    });
    mutators.addWorkingSymbol({ id: 'b', type: 'scada-rect', x: 0, y: 0, width: 5, height: 5 });

    expect(onError).toHaveBeenCalledWith('editor-internal-error', expect.stringContaining('apply boom'));
    expect(session.workingConfig.symbols.length).toBe(beforeCount);
    expect(session.undoStack.undoStackDepth).toBe(beforeDepth);
    expect(session.undoStack.canUndo).toBe(false);
  });

  it('updateWorkingNode applyDiff failure preserves undo stack depth (no stale entry)', () => {
    const { engine, session, mutators, onError } = s;
    const beforeDepth = session.undoStack.undoStackDepth;
    vi.spyOn(engine, 'applyDiff').mockImplementation(() => {
      throw new Error('update boom');
    });
    mutators.updateWorkingNode('a', { x: 999 });
    expect(onError).toHaveBeenCalledWith('editor-internal-error', expect.stringContaining('update boom'));
    expect(session.undoStack.undoStackDepth).toBe(beforeDepth);
  });

  it('undo applyDiff failure preserves the undo entry + working copy + dispatches editor-internal-error', () => {
    const { engine, session, mutators, onError } = s;
    mutators.addWorkingSymbol({ id: 'b', type: 'scada-rect', x: 1, y: 1, width: 5, height: 5 });
    expect(session.undoStack.undoStackDepth).toBe(1);
    const symbolsAfterAdd = session.workingConfig.symbols.length;
    vi.restoreAllMocks();
    vi.spyOn(engine, 'applyDiff').mockImplementation(() => {
      throw new Error('undo boom');
    });

    mutators.undo();

    expect(onError).toHaveBeenCalledWith('editor-internal-error', expect.stringContaining('undo boom'));
    expect(session.undoStack.undoStackDepth).toBe(1);
    expect(session.undoStack.canUndo).toBe(true);
    expect(session.undoStack.canRedo).toBe(false);
    expect(session.workingConfig.symbols.length).toBe(symbolsAfterAdd);
  });

  it('redo applyDiff failure preserves the redo entry + dispatches editor-internal-error', () => {
    const { engine, session, mutators, onError } = s;
    mutators.addWorkingSymbol({ id: 'b', type: 'scada-rect', x: 1, y: 1, width: 5, height: 5 });
    mutators.undo();
    expect(session.undoStack.canRedo).toBe(true);
    vi.restoreAllMocks();
    vi.spyOn(engine, 'applyDiff').mockImplementation(() => {
      throw new Error('redo boom');
    });

    mutators.redo();

    expect(onError).toHaveBeenCalledWith('editor-internal-error', expect.stringContaining('redo boom'));
    expect(session.undoStack.canRedo).toBe(true);
  });

  it('transform-transaction applyDiff failure aborts the transaction (no stale commit)', () => {
    const { engine, session, ctx, onError } = s;
    ctx.undoRedo.beginTransaction('transform-move', session.workingConfig);
    expect(ctx.undoRedo.isInTransaction).toBe(true);

    vi.spyOn(engine, 'applyDiff').mockImplementation(() => {
      throw new Error('txn boom');
    });
    // mutate working copy then sync (simulates per-frame geometry sync failing).
    session.workingConfig.symbols[0].x = 50;
    ctx.syncWorkingCopy();

    expect(onError).toHaveBeenCalledWith('editor-internal-error', expect.stringContaining('txn boom'));
    expect(ctx.undoRedo.isInTransaction).toBe(false);
  });
});

describe('createRuntimeCore assembly failure (plan 2026-08-08-0900-1 Phase 2 / P2 #18)', () => {
  let container: HTMLDivElement;
  beforeEach(() => {
    resetLeaferMock();
    registerBuiltinScadaSymbols();
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it('dispatches editor-mount-failed and returns null when adapter assembly throws (no half-init)', () => {
    const engine = ScadaEditorEngine.create({ container });
    engine.build(baseConfig);
    // Force attachEditorAdapter to throw by making editor.on throw.
    const editor = engine.editor as { on: (...args: unknown[]) => void };
    editor.on = () => {
      throw new Error('attach boom');
    };
    const session = createScadaEditorSession(baseConfig);
    const onError = vi.fn();
    const latest = makeLatest(onError);

    const result = createRuntimeCore(engine, session, latest, { current: false });

    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledWith('editor-mount-failed', expect.stringContaining('attach boom'));
    engine.destroy();
  });
});
