import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { UndoStack } from '../undo-redo/undo-stack.js';
import { UndoRedoAdapter } from '../undo-redo/undo-redo-adapter.js';
import type { ScadaConfigDiff } from '../../serialization/config-types.js';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import { EditorHistoryPanel } from './history-panel.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

function makeEntry(kind: string, timestamp: number): { forward: ScadaConfigDiff; inverse: ScadaConfigDiff; operationKind: never; timestamp: number } {
  const forward: ScadaConfigDiff = { added: [], removed: [], updated: [] };
  return { forward, inverse: { ...forward }, operationKind: kind as never, timestamp };
}

function makeRuntime(undoStack: UndoStack): EditorEngineRuntime {
  return {
    engine: {} as never,
    session: {
      workingConfig: { version: 1, variables: [], symbols: [] },
      committedBaseline: { version: 1, variables: [], symbols: [] },
      selection: [],
      mode: 'edit' as const,
      undoStack,
    },
    undoRedo: new UndoRedoAdapter(undoStack),
  } as unknown as EditorEngineRuntime;
}

beforeEach(() => {
  resetLeaferMock();
  resetFluxI18n();
  initFluxI18n();
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('EditorHistoryPanel (plan 521 / U2, design-undo-redo.md §13 read-only ruling)', () => {
  it('renders closed when open=false', () => {
    render(
      <EditorHistoryPanel runtime={makeRuntime(new UndoStack())} open={false} onOpenChange={() => undefined} />,
    );
    expect(document.querySelector('[data-slot="scada-editor-toolbox-history"]')).toBeNull();
  });

  it('lists undo entries top-first with index + operationKind + data attributes', () => {
    const stack = new UndoStack();
    stack.push(makeEntry('add-symbol', 100));
    stack.push(makeEntry('connection-update', 200));
    stack.push(makeEntry('z-order', 300));
    render(
      <EditorHistoryPanel runtime={makeRuntime(stack)} open onOpenChange={() => undefined} />,
    );
    const dialog = document.querySelector('[data-slot="scada-editor-toolbox-history"]');
    expect(dialog).toBeTruthy();
    const rows = document.querySelectorAll('[data-testid="toolbox-history-row"]');
    expect(rows).toHaveLength(3);
    // 倒序：栈顶在上（design-undo-redo.md §13 UI 契约）。
    expect(rows[0].getAttribute('data-operation-kind')).toBe('z-order');
    expect(rows[0].textContent).toContain('3');
    expect(rows[1].getAttribute('data-operation-kind')).toBe('connection-update');
    expect(rows[2].getAttribute('data-operation-kind')).toBe('add-symbol');
    expect(rows[0].hasAttribute('data-redo')).toBe(false);
  });

  it('empty undo stack renders empty state; redo section hidden when redo stack empty', () => {
    render(
      <EditorHistoryPanel runtime={makeRuntime(new UndoStack())} open onOpenChange={() => undefined} />,
    );
    expect(document.querySelector('[data-testid="toolbox-history-empty"]')).toBeTruthy();
    expect(document.querySelectorAll('[data-testid="toolbox-history-row"]')).toHaveLength(0);
  });

  it('redo section renders when redo stack non-empty (marked data-redo)', () => {
    const stack = new UndoStack();
    stack.push(makeEntry('add-symbol', 100));
    stack.popForUndo();
    render(
      <EditorHistoryPanel runtime={makeRuntime(stack)} open onOpenChange={() => undefined} />,
    );
    const rows = document.querySelectorAll('[data-testid="toolbox-history-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0].getAttribute('data-redo')).toBe('true');
    expect(rows[0].getAttribute('data-operation-kind')).toBe('add-symbol');
  });

  it('rows are read-only (no clickable op targets inside a row; truncate 裁定)', () => {
    const stack = new UndoStack();
    stack.push(makeEntry('add-symbol', 100));
    render(
      <EditorHistoryPanel runtime={makeRuntime(stack)} open onOpenChange={() => undefined} />,
    );
    const row = document.querySelector('[data-testid="toolbox-history-row"]') as HTMLElement;
    // 行内不允许出现按钮/可点击操作目标（回跳 truncate 归 L5.8，§13 裁定）。
    expect(row.querySelectorAll('button')).toHaveLength(0);
    expect(row.getAttribute('role')).toBeNull();
    expect(stack.undoStackDepth).toBe(1);
  });
});
