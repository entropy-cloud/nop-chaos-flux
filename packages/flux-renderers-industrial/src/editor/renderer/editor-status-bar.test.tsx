import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UndoStack } from '../undo-redo/undo-stack.js';
import type { EditorEngineRuntime } from './hooks/use-editor-engine.js';
import { EditorStatusBar } from './editor-status-bar.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

afterEach(() => {
  cleanup();
});

function makeRuntime(mode: 'edit' | 'preview', selection: string[]): EditorEngineRuntime {
  const undoStack = new UndoStack();
  // 直接构造两个栈位（undo push 由测试构造场景）。
  const pushEntry = () => {
    undoStack.push({
      forward: { added: [], removed: [], updated: [] },
      inverse: { added: [], removed: [], updated: [] },
      operationKind: 'update-symbol',
      timestamp: 1,
    });
  };
  pushEntry();
  pushEntry();
  undoStack.popForUndo();
  return {
    engine: { getViewport: () => ({ x: 12, y: -4, scale: 1.5 }) } as never,
    session: {
      workingConfig: { version: 1, variables: [], symbols: [] },
      committedBaseline: { version: 1, variables: [], symbols: [] },
      selection,
      mode,
      undoStack,
    },
  } as unknown as EditorEngineRuntime;
}

describe('EditorStatusBar (plan 521 / U4, design-architecture.md §4.1 + design-undo-redo.md §4.5)', () => {
  it('renders marker + mode/viewport/selection/undo-redo summary', () => {
    const { container } = render(<EditorStatusBar runtime={makeRuntime('edit', ['a', 'b'])} selection={['a', 'b']} />);
    const bar = container.querySelector('[data-slot="scada-editor-status-bar"]');
    expect(bar).toBeTruthy();
    expect(bar!.classList.contains('nop-scada-editor-status-bar')).toBe(true);

    const mode = container.querySelector('[data-testid="editor-status-mode"]');
    expect(mode?.textContent).toContain('edit');
    const viewport = container.querySelector('[data-testid="editor-status-viewport"]');
    expect(viewport?.textContent).toContain('12');
    expect(viewport?.textContent).toContain('-4');
    expect(viewport?.textContent).toContain('1.50x');
    const selectionEl = container.querySelector('[data-testid="editor-status-selection"]');
    expect(selectionEl?.textContent).toContain('2');
    const historyEl = container.querySelector('[data-testid="editor-status-undo-redo"]');
    // undo 深度 2 push + 1 undo = 1；redo 1。
    expect(historyEl?.getAttribute('data-undo-depth')).toBe('1');
    expect(historyEl?.getAttribute('data-redo-depth')).toBe('1');
  });

  it('reflects preview mode (data source = live session)', () => {
    const { container } = render(<EditorStatusBar runtime={makeRuntime('preview', [])} selection={[]} />);
    expect(container.querySelector('[data-testid="editor-status-mode"]')?.textContent).toContain('preview');
    expect(container.querySelector('[data-testid="editor-status-selection"]')?.textContent).toContain('0');
  });
});
