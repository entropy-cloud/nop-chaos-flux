import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validEditorConfig } from '../test-support/editor-config-fixtures.js';
import { readScadaEditorTestHandle } from './editor-test-handle.js';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';

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

/**
 * V12e 族2 (G5-R2-视角3-03, plan 487, proof-first):
 *
 * 1. The canvas emits `data-mode` but nothing consumed it and the editing
 *    mutators had no mode gate — in preview mode the programmatic write
 *    channels (test/component handles) ghost-wrote into the working copy.
 *    The stylesheet must consume the preview state, and write-entry mutators
 *    must no-op while session.mode === 'preview'.
 * 2. The editor toolbox status span is a bare span with no CSS rule and no
 *    live-region role — it must carry role="status" and a token-driven rule
 *    (asserted on source per the editor-styles.test.ts precedent).
 */

const editorStyles = readFileSync('src/editor/styles.css', 'utf8');

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(cleanup);

function editorRoot() {
  return document.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
}

async function renderReadyEditor() {
  const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
  render(
    <SchemaRenderer
      schemaUrl="test://editor-v12e-preview-gate"
      schema={{ type: 'scada-editor-canvas', config: validEditorConfig() as never }}
      env={createDefaultEnv()}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
  await waitFor(() => {
    expect(editorRoot()?.getAttribute('data-status')).toBe('ready');
  });
  const cid = Number(editorRoot().getAttribute('data-cid'));
  return readScadaEditorTestHandle(cid)!;
}

describe('scada editor — preview state consumption + mutator mode gate (G5-R2-视角3-03)', () => {
  it('preview mode blocks editing mutators; switching back restores them', async () => {
    const handle = await renderReadyEditor();
    expect(handle.session.mode).toBe('edit');

    // Baseline: add works in edit mode.
    handle.addSymbol({ id: 'sym-1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 } as never);
    await waitFor(() => expect(handle.session.workingConfig.symbols.map((s) => s.id)).toContain('sym-1'));

    handle.switchMode('preview');
    expect(handle.session.mode).toBe('preview');
    await waitFor(() => expect(editorRoot().getAttribute('data-mode')).toBe('preview'));

    // Preview is read-only: every write entry no-ops (previously ghost-wrote).
    handle.addSymbol({ id: 'sym-2', type: 'scada-rect', x: 5, y: 5, width: 10, height: 10 } as never);
    handle.removeSymbol('sym-1');
    handle.updateSymbol('sym-1', { x: 42 });
    expect(handle.session.workingConfig.symbols.map((s) => s.id)).toContain('sym-1');
    expect(handle.session.workingConfig.symbols.map((s) => s.id)).not.toContain('sym-2');
    const kept = handle.session.workingConfig.symbols.find((s) => s.id === 'sym-1');
    expect(kept?.x).toBe(0);

    // Mode/selection channels stay functional; switching back restores writes.
    handle.switchMode('edit');
    handle.addSymbol({ id: 'sym-3', type: 'scada-rect', x: 1, y: 1, width: 10, height: 10 } as never);
    await waitFor(() => expect(handle.session.workingConfig.symbols.map((s) => s.id)).toContain('sym-3'));
  });

  it('the stylesheet consumes data-mode=preview and styles the toolbox status', () => {
    expect(editorStyles).toMatch(/data-mode='preview'/);
    expect(editorStyles).toMatch(/\.nop-scada-editor-toolbox-status\s*\{/);
  });
});
