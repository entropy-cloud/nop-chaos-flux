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
