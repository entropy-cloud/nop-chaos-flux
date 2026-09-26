import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../../symbols/register-builtin.js';
import { UndoStack } from '../undo-redo/undo-stack.js';
import { UndoRedoAdapter } from '../undo-redo/undo-redo-adapter.js';
import type { ZOrderAction } from './z-order.js';
import type { ScadaConfig, ScadaSymbolNode } from '../../serialization/config-types.js';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import { EditorLayersPanel } from './layers-panel.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

const config: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    { id: 'rect-a', type: 'scada-rect', x: 0, y: 0, width: 50, height: 50 },
    {
      id: 'grp',
      type: 'scada-group',
      x: 0,
      y: 0,
      children: [{ id: 'rect-b', type: 'scada-ellipse', x: 10, y: 10, width: 40, height: 40 } as ScadaSymbolNode],
    },
  ],
};

interface Calls {
  selections: string[][];
  zOrders: ZOrderAction[];
}

function makeRuntime(mode: 'edit' | 'preview' = 'edit'): EditorEngineRuntime & { calls: Calls } {
  const calls: Calls = { selections: [], zOrders: [] };
  const session = {
    workingConfig: structuredClone(config),
    committedBaseline: config,
    selection: [] as string[],
    mode,
    undoStack: new UndoStack(),
  };
  const rt = {
    engine: {} as never,
    session,
    undoRedo: new UndoRedoAdapter(session.undoStack),
    setSelection: (ids: string[]) => {
      calls.selections.push(ids);
      session.selection = [...ids];
    },
    reorderZOrder: (action: ZOrderAction) => {
      calls.zOrders.push(action);
      return true;
    },
  } as unknown as EditorEngineRuntime & { calls: Calls };
  (rt as { calls: Calls }).calls = calls;
  return rt;
}

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
  resetFluxI18n();
  initFluxI18n();
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('EditorLayersPanel (plan 521 / U3, design-toolbox.md §13.2 pure-reorder MVP)', () => {
  it('renders closed when open=false', () => {
    render(
      <EditorLayersPanel runtime={makeRuntime()} open={false} onOpenChange={() => undefined} selection={[]} />,
    );
    expect(document.querySelector('[data-slot="scada-editor-toolbox-layers"]')).toBeNull();
  });

  it('expands nested group children with depth attributes', () => {
    render(
      <EditorLayersPanel runtime={makeRuntime()} open onOpenChange={() => undefined} selection={[]} />,
    );
    const rows = document.querySelectorAll('[data-testid="toolbox-layer-row"]');
    expect(rows).toHaveLength(3);
    expect(rows[0].getAttribute('data-layer-depth')).toBe('0');
    expect(rows[1].getAttribute('data-layer-depth')).toBe('0');
    expect(rows[2].getAttribute('data-layer-depth')).toBe('1');
    // 图元名走 industrial.scada.symbol.<type>（palette 同源）。
    expect(rows[2].textContent).toContain('椭圆');
    expect(rows[2].textContent).toContain('rect-b');
  });

  it('clicking a row selects the symbol via runtime.setSelection([id])', () => {
    const rt = makeRuntime();
    render(
      <EditorLayersPanel runtime={rt} open onOpenChange={() => undefined} selection={[]} />,
    );
    const selectBtn = document.querySelector('[data-testid="toolbox-layer-row-select"]') as HTMLButtonElement;
    fireEvent.click(selectBtn);
    expect(rt.calls.selections).toEqual([['rect-a']]);
  });

  it('move up/down on top-level row sets selection then reorders via reorderZOrder', () => {
    const rt = makeRuntime();
    render(
      <EditorLayersPanel runtime={rt} open onOpenChange={() => undefined} selection={[]} />,
    );
    const upButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-testid="toolbox-layer-move-up"]'),
    );
    expect(upButtons).toHaveLength(3);
    fireEvent.click(upButtons[1]);
    expect(rt.calls.selections).toEqual([['grp']]);
    expect(rt.calls.zOrders).toEqual(['moveUp']);
  });

  it('nested rows have reorder buttons disabled (MVP: no nested z-order)', () => {
    const rt = makeRuntime();
    render(
      <EditorLayersPanel runtime={rt} open onOpenChange={() => undefined} selection={[]} />,
    );
    const rows = document.querySelectorAll('[data-testid="toolbox-layer-row"]');
    const nestedUp = rows[2].querySelector<HTMLButtonElement>('[data-testid="toolbox-layer-move-up"]');
    const nestedDown = rows[2].querySelector<HTMLButtonElement>('[data-testid="toolbox-layer-move-down"]');
    expect(nestedUp?.disabled).toBe(true);
    expect(nestedDown?.disabled).toBe(true);
    const topUp = rows[0].querySelector<HTMLButtonElement>('[data-testid="toolbox-layer-move-up"]');
    expect(topUp?.disabled).toBe(false);
  });

  it('reorder buttons disabled in preview mode (R5 write gating)', () => {
    const rt = makeRuntime('preview');
    render(
      <EditorLayersPanel runtime={rt} open onOpenChange={() => undefined} selection={[]} />,
    );
    const upButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-testid="toolbox-layer-move-up"]'),
    );
    expect(upButtons.every((b) => b.disabled)).toBe(true);
  });

  it('selected rows are highlighted via selection prop', () => {
    render(
      <EditorLayersPanel runtime={makeRuntime()} open onOpenChange={() => undefined} selection={['rect-a']} />,
    );
    const rows = document.querySelectorAll('[data-testid="toolbox-layer-row"]');
    expect(rows[0].getAttribute('data-selected')).toBe('true');
    expect(rows[1].getAttribute('data-selected')).toBe('false');
  });

  it('empty scene renders empty state', () => {
    const rt = makeRuntime();
    (rt.session.workingConfig as { symbols: ScadaSymbolNode[] }).symbols = [];
    render(
      <EditorLayersPanel runtime={rt} open onOpenChange={() => undefined} selection={[]} />,
    );
    expect(document.querySelector('[data-testid="toolbox-layers-empty"]')).toBeTruthy();
  });
});
