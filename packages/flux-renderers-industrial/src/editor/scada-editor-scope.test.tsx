import React from 'react';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';
import { SCADA_EDITOR_MANIFEST_V1 } from './scada-editor-manifest.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

function StatusProbe() {
  const status = useScopeSelector((data: Record<string, unknown>) => data.scadaHostStatus);
  return (
    <span data-testid="scada-status">
      {status
        ? `${(status as { kind?: string }).kind}:${(status as { dirty?: boolean }).dirty}:${
            (status as { mode?: string }).mode
          }`
        : ''}
    </span>
  );
}

const statusProbeRenderer: RegisteredRendererDefinition = {
  type: 'scada-status-probe',
  component: StatusProbe,
};

/**
 * P3.3（plan 554）：scope 投影契约（形状 = P3.1 manifest projection；statusPath 六键 summary）。
 */
describe('scada-editor scope projection (P3.3)', () => {
  it('projection keys equal the P3.1 manifest projection fields (single source parity)', () => {
    const manifestKeys = Object.keys(SCADA_EDITOR_MANIFEST_V1.projection.fields).sort();
    expect(manifestKeys).toEqual(['config', 'mode', 'runtime', 'selection']);
  });

  it('publishes the host status summary through statusPath (§2.4 keys + mode/status)', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...industrialEditorRendererDefinitions,
      statusProbeRenderer,
    ]);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://industrial-editor/status-path"
        schema={[
          {
            type: 'scada-editor-canvas',
            testid: 'scada-editor-scope',
            statusPath: 'scadaHostStatus',
          },
          { type: 'scada-status-probe' },
        ] as never}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('.nop-scada-editor-layout-canvas')).toBeTruthy();
    });
    await waitFor(() => {
      // kind:dirty:mode — dirty=false（空栈深度 == 保存基线 0）、mode=edit
      expect(document.querySelector('[data-testid="scada-status"]')?.textContent).toMatch(
        /^scada-editor:false:edit$/,
      );
    });
  });
});

describe('scada-editor dirty depth tracking (P3.3)', () => {
  it('dirty is false initially, true after a mutation, false again after save (depth tracking)', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...industrialEditorRendererDefinitions,
      statusProbeRenderer,
    ]);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://industrial-editor/dirty-tracking"
        schema={[
          {
            type: 'scada-editor-canvas',
            testid: 'scada-editor-dirty',
            statusPath: 'scadaHostStatus',
          },
          { type: 'scada-status-probe' },
        ] as never}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const canvas = await waitFor(() => {
      const el = container.querySelector('.nop-scada-editor-layout-canvas') as HTMLElement;
      if (!el || el.getAttribute('data-status') !== 'ready') throw new Error('not ready');
      return el;
    });

    const statusText = () =>
      document.querySelector('[data-testid="scada-status"]')?.textContent ?? '';

    // initial: depth 0 == saved depth 0 → not dirty
    await waitFor(() => {
      expect(statusText()).toMatch(/^scada-editor:false:/);
    });

    // mutate via keyboard Delete needs a selection; instead simulate a symbol add through
    // the drop path is heavy — use the test handle save + programmatic undo depth via
    // component handle: add through palette-less path is unavailable, so drive the undo
    // stack through the editor's own save-baseline: perform handle save (depth stays 0),
    // then delete requires selection... Simplest sound path: keyboard ArrowRight on a
    // selected node needs selection too. Use the test handle's addSymbol:
    const cid = canvas.getAttribute('data-cid');
    const handle = cid
      ? (window as unknown as Record<string, { addSymbol?: (n: unknown) => void } & Record<string, unknown>>)[
          `__flux_scada_editor_${cid}`
        ]
      : undefined;
    expect(handle).toBeTruthy();
    handle!.addSymbol!({ id: 'dirty-1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 });
    await waitFor(() => {
      expect(statusText()).toMatch(/^scada-editor:true:/);
    });

    // save through the handle → depth baseline updates → not dirty
    (handle as unknown as { save: () => unknown }).save();
    await waitFor(() => {
      expect(statusText()).toMatch(/^scada-editor:false:/);
    });
  });
});
