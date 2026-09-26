import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { UndoStack } from '../undo-redo/undo-stack.js';
import { UndoRedoAdapter } from '../undo-redo/undo-redo-adapter.js';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import type { ScadaConfig } from '../../serialization/config-types.js';
import { EditorConnectionsDialog } from './connections-dialog.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

const config: ScadaConfig = {
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
      custom: { connections: [{ id: 'j1-conn-0', x: 1, y: 0.5, direction: 'out', target: 'dev' }] },
    },
    { id: 'dev', type: 'scada-rect', x: 300, y: 0, width: 100, height: 100 },
  ],
};

function makeRuntime(overrides: { connections?: Array<{ junctionId: string; connection: { id: string; target?: string }; dangling: boolean }>; mode?: 'edit' | 'preview' } = {}) {
  const calls: Array<[string, string]> = [];
  const rt = {
    engine: {} as never,
    session: {
      workingConfig: config,
      committedBaseline: config,
      selection: [] as string[],
      mode: overrides.mode ?? ('edit' as const),
      undoStack: new UndoStack(),
    },
    undoRedo: new UndoRedoAdapter(new UndoStack()),
    listConnections: () =>
      overrides.connections ?? [
        { junctionId: 'j1', connection: { id: 'j1-conn-0', target: 'dev' } as never, dangling: false },
        { junctionId: 'j1', connection: { id: 'j1-conn-1', target: undefined } as never, dangling: true },
      ],
    disconnectConnection: (junctionId: string, connectionId: string) => {
      calls.push([junctionId, connectionId]);
      return true;
    },
  } as unknown as EditorEngineRuntime & { disconnectConnectionCalls: Array<[string, string]> };
  (rt as { disconnectConnectionCalls: Array<[string, string]> }).disconnectConnectionCalls = calls;
  return rt;
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

describe('EditorConnectionsDialog (plan 521 / U1, design-toolbox.md §13.1)', () => {
  it('renders closed when open=false (no data read)', () => {
    const rt = makeRuntime();
    const listConnections = vi.spyOn(rt, 'listConnections');
    render(
      <EditorConnectionsDialog runtime={rt} open={false} onOpenChange={() => undefined} />,
    );
    expect(document.querySelector('[data-slot="scada-editor-toolbox-connections"]')).toBeNull();
    expect(listConnections).not.toHaveBeenCalled();
  });

  it('lists connections with junction/id/target and dangling marker', () => {
    const rt = makeRuntime();
    render(
      <EditorConnectionsDialog runtime={rt} open onOpenChange={() => undefined} />,
    );
    const dialog = document.querySelector('[data-slot="scada-editor-toolbox-connections"]');
    expect(dialog).toBeTruthy();
    const rows = document.querySelectorAll('[data-testid="toolbox-connection-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].getAttribute('data-dangling')).toBe('false');
    expect(rows[0].textContent).toContain('j1-conn-0');
    expect(rows[0].textContent).toContain('dev');
    expect(rows[1].getAttribute('data-dangling')).toBe('true');
    expect(rows[1].textContent).toContain('悬空');
  });

  it('disconnect button consumes runtime.disconnectConnection(junctionId, connectionId)', () => {
    const rt = makeRuntime();
    render(
      <EditorConnectionsDialog runtime={rt} open onOpenChange={() => undefined} />,
    );
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-testid="toolbox-connection-disconnect"]'),
    );
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    expect((rt as { disconnectConnectionCalls: Array<[string, string]> }).disconnectConnectionCalls).toEqual([
      ['j1', 'j1-conn-0'],
    ]);
  });

  it('empty state renders when no connections', () => {
    const rt = makeRuntime({ connections: [] });
    render(
      <EditorConnectionsDialog runtime={rt} open onOpenChange={() => undefined} />,
    );
    expect(document.querySelector('[data-testid="toolbox-connections-empty"]')).toBeTruthy();
    expect(document.querySelectorAll('[data-testid="toolbox-connection-row"]')).toHaveLength(0);
  });

  it('disconnect disabled in preview mode (R5 write gating)', () => {
    const rt = makeRuntime({ mode: 'preview' });
    render(
      <EditorConnectionsDialog runtime={rt} open onOpenChange={() => undefined} />,
    );
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-testid="toolbox-connection-disconnect"]'),
    );
    expect(buttons.every((b) => b.disabled)).toBe(true);
  });
});
