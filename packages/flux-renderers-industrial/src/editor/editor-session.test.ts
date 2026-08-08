import { describe, it, expect } from 'vitest';
import {
  createScadaEditorSession,
  resetSession,
  findWorkingNode,
  projectSessionChange,
  type ScadaEditorSession,
} from './editor-session.js';
import { UndoStack } from './undo-redo/undo-stack.js';
import type { ScadaConfig } from '../serialization/config-types.js';

const baseConfig: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    { id: 'rect-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
    {
      id: 'group-1',
      type: 'scada-group',
      x: 0,
      y: 0,
      children: [
        { id: 'child-1', type: 'scada-rect', x: 5, y: 5, width: 30, height: 30 },
      ],
    },
  ],
};

describe('createScadaEditorSession (M1 subset, no undo/redo stack)', () => {
  it('clones config into working copy + committedBaseline (R5 isolation Layer 2)', () => {
    const session = createScadaEditorSession(baseConfig);
    expect(session.workingConfig).not.toBe(baseConfig);
    expect(session.workingConfig.symbols).not.toBe(baseConfig.symbols);
    expect(session.workingConfig.symbols).toEqual(baseConfig.symbols);
    expect(session.committedBaseline).toEqual(baseConfig);
    expect(session.committedBaseline).not.toBe(session.workingConfig);
  });

  it('defaults: empty selection + edit mode', () => {
    const session = createScadaEditorSession(baseConfig);
    expect(session.selection).toEqual([]);
    expect(session.mode).toBe('edit');
  });

  it('respects explicit mode + selection options', () => {
    const session = createScadaEditorSession(baseConfig, { mode: 'preview', selection: ['rect-1'] });
    expect(session.mode).toBe('preview');
    expect(session.selection).toEqual(['rect-1']);
  });

  it('mutating working copy does not affect committedBaseline (R5 Layer 2)', () => {
    const session = createScadaEditorSession(baseConfig);
    session.workingConfig.symbols[0].x = 999;
    expect(session.committedBaseline.symbols[0].x).toBe(10);
  });

  it('deep-clones group children', () => {
    const session = createScadaEditorSession(baseConfig);
    const workingChild = (session.workingConfig.symbols[1] as { children: Array<{ x: number }> }).children[0];
    workingChild.x = 777;
    const baselineChild = (session.committedBaseline.symbols[1] as { children: Array<{ x: number }> }).children[0];
    expect(baselineChild.x).toBe(5);
  });

  // plan 2026-08-08-0900-1 Phase 1 / P2 #4：nested custom 深克隆——working.custom 子对象变更不串改 baseline.custom。
  it('deep-clones nested custom (working.custom mutation does not leak to baseline)', () => {
    const configWithCustom: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'j1',
          type: 'scada-pipe-junction',
          x: 0,
          y: 0,
          width: 80,
          height: 40,
          custom: { connections: [{ id: 'c1', x: 0.5, y: 0.5, direction: 'out', target: 'dev' }] },
        },
      ],
    };
    const session = createScadaEditorSession(configWithCustom);
    const workingConnections = (
      session.workingConfig.symbols[0].custom as { connections: Array<{ x: number }> }
    ).connections;
    workingConnections[0].x = 0.99;
    const baselineConnections = (
      session.committedBaseline.symbols[0].custom as { connections: Array<{ x: number }> }
    ).connections;
    expect(baselineConnections[0].x).toBe(0.5);
    // custom 对象本身也不共享引用。
    expect(session.workingConfig.symbols[0].custom).not.toBe(session.committedBaseline.symbols[0].custom);
  });

  it('deep-clones nested custom inside group children', () => {
    const configWithGroupCustom: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'g1',
          type: 'scada-group',
          x: 0,
          y: 0,
          children: [
            {
              id: 'j1',
              type: 'scada-pipe-junction',
              x: 0,
              y: 0,
              width: 10,
              height: 10,
              custom: { connections: [{ id: 'c1', x: 0.1, y: 0.2, direction: 'out' }] },
            },
          ],
        },
      ],
    };
    const session = createScadaEditorSession(configWithGroupCustom);
    const workingChild = session.workingConfig.symbols[0].children![0];
    (workingChild.custom as { connections: Array<{ x: number }> }).connections[0].x = 0.9;
    const baselineChild = session.committedBaseline.symbols[0].children![0];
    expect((baselineChild.custom as { connections: Array<{ x: number }> }).connections[0].x).toBe(0.1);
  });
});

describe('resetSession (load 句柄消费)', () => {
  it('replaces working copy + committedBaseline + clears selection + resets mode to edit', () => {
    const session = createScadaEditorSession(baseConfig, { mode: 'preview', selection: ['rect-1'] });
    const newConfig: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [{ id: 'new-rect', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }],
    };
    resetSession(session, newConfig);
    expect(session.workingConfig.symbols).toEqual(newConfig.symbols);
    expect(session.committedBaseline.symbols).toEqual(newConfig.symbols);
    expect(session.selection).toEqual([]);
    expect(session.mode).toBe('edit');
  });
});

describe('createScadaEditorSession config cloning branches', () => {
  it('clones config with variables/viewport/background', () => {
    const fullConfig: ScadaConfig = {
      version: 1,
      viewport: { x: 10, y: 20, scale: 1.5 },
      background: { color: '#eef2f6' },
      variables: [{ id: 'var1', source: 'static', value: 42 }],
      symbols: [{ id: 'r1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }],
    };
    const session = createScadaEditorSession(fullConfig);
    expect(session.workingConfig.viewport).toEqual({ x: 10, y: 20, scale: 1.5 });
    expect(session.workingConfig.background).toEqual({ color: '#eef2f6' });
    expect(session.workingConfig.variables).toEqual([{ id: 'var1', source: 'static', value: 42 }]);
    // cloned (not same reference)
    expect(session.workingConfig.variables).not.toBe(fullConfig.variables);
    expect(session.workingConfig.viewport).not.toBe(fullConfig.viewport);
  });
});

// plan 2026-08-08-1809-2 Phase 1 / F1（Proof）：缺失 variables 的合法 config 进入 createScadaEditorSession
// 不抛（守卫已在 commit c2dd1627b 落地于 cloneConfig:118 `variables !== undefined` 条件展开）。
// 既有 fixture 恒带 variables:[]，从未覆盖缺失路径；本用例锁定该守卫防回归。
describe('createScadaEditorSession — missing variables guard (F1 regression lock)', () => {
  it('does not throw when variables is omitted and preserves symbols + undefined variables', () => {
    const configNoVars: ScadaConfig = {
      version: 1,
      symbols: [{ id: 'x', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }],
    } as ScadaConfig;
    const session = createScadaEditorSession(configNoVars);
    expect(session.workingConfig.symbols).toEqual(configNoVars.symbols);
    expect(session.workingConfig.variables).toBeUndefined();
    expect(session.committedBaseline.variables).toBeUndefined();
  });
});

describe('findWorkingNode', () => {
  it('finds top-level node by id', () => {
    const session = createScadaEditorSession(baseConfig);
    expect(findWorkingNode(session, 'rect-1')?.id).toBe('rect-1');
  });

  it('finds nested child in group subtree', () => {
    const session = createScadaEditorSession(baseConfig);
    expect(findWorkingNode(session, 'child-1')?.id).toBe('child-1');
  });

  it('returns undefined for unknown id', () => {
    const session = createScadaEditorSession(baseConfig);
    expect(findWorkingNode(session, 'nonexistent')).toBeUndefined();
  });
});

describe('projectSessionChange (onSessionChange payload)', () => {
  it('projects canUndo/canRedo as derived from undoStack (E7.2)', () => {
    const session: ScadaEditorSession = {
      workingConfig: baseConfig,
      committedBaseline: baseConfig,
      selection: ['rect-1'],
      mode: 'edit',
      undoStack: new UndoStack(),
    };
    const payload = projectSessionChange(session);
    expect(payload.canUndo).toBe(false);
    expect(payload.canRedo).toBe(false);
    expect(payload.selection).toEqual(['rect-1']);
    expect(payload.mode).toBe('edit');
  });

  it('projects canUndo true after an entry is pushed onto undoStack', () => {
    const stack = new UndoStack();
    stack.push({
      forward: { added: [], removed: [], updated: [] },
      inverse: { added: [], removed: [], updated: [] },
      operationKind: 'add-symbol',
      timestamp: 1,
    });
    const session: ScadaEditorSession = {
      workingConfig: baseConfig,
      committedBaseline: baseConfig,
      selection: ['rect-1'],
      mode: 'edit',
      undoStack: stack,
    };
    expect(projectSessionChange(session).canUndo).toBe(true);
  });

  it('projects a copy of selection (not the live array)', () => {
    const session: ScadaEditorSession = {
      workingConfig: baseConfig,
      committedBaseline: baseConfig,
      selection: ['rect-1'],
      mode: 'edit',
      undoStack: new UndoStack(),
    };
    const payload = projectSessionChange(session);
    payload.selection.push('mutated');
    expect(session.selection).toEqual(['rect-1']);
  });
});
