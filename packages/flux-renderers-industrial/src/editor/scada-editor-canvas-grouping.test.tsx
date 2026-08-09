import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { readScadaEditorTestHandle } from './editor-test-handle.js';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';
import type { ScadaConfig } from '../serialization/config-types.js';
import {
  collectAllSymbols,
  collectWorldBounds,
} from './editor-working-helpers.js';

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

function renderEditor(tag: string, config: ScadaConfig) {
  const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl={`test://editor-grouping/${tag}`}
      schema={{ type: 'scada-editor-canvas', config: config as never }}
      env={createDefaultEnv()}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

async function waitForReadyAndCid(container: HTMLElement): Promise<number> {
  await waitFor(() => {
    expect(container.querySelector('[data-slot="scada-editor-canvas"]')?.getAttribute('data-status')).toBe('ready');
  });
  const root = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
  return Number(root.getAttribute('data-cid'));
}

/**
 * offset-group fixture（plan 2026-08-07-1835-1 Phase 2 / multi P1-02 + open P1-C 簇）：
 * group 放在世界 (300, 200)（区别于现有 (0,0) 套件），内含 device 与嵌套 pipe-junction。
 */
function offsetGroupConfig(): ScadaConfig {
  return {
    version: 1,
    variables: [],
    symbols: [
      {
        id: 'grp-1',
        type: 'scada-group',
        x: 300,
        y: 200,
        children: [
          { id: 'dev-in-group', type: 'scada-rect', x: 10, y: 10, width: 80, height: 60 },
          {
            id: 'nested-junction',
            type: 'scada-pipe-junction',
            x: 120,
            y: 20,
            width: 50,
            height: 50,
            custom: {
              connections: [
                { id: 'c1', x: 0.7, y: 0.5, direction: 'out', target: 'dev-in-group' },
              ],
            },
          },
        ],
      },
      { id: 'outside-dev', type: 'scada-rect', x: 50, y: 50, width: 40, height: 40 },
    ],
  };
}

describe('grouping coord space / tree traversal (plan 2026-08-07-1835-1 Phase 2)', () => {
  describe('shared walker pure-logic', () => {
    it('collectAllSymbols recurses into group children (P1-C1/C2)', () => {
      const all = collectAllSymbols(offsetGroupConfig().symbols);
      const ids = all.map((s) => s.id).sort();
      expect(ids).toEqual(['dev-in-group', 'grp-1', 'nested-junction', 'outside-dev']);
    });

    it('collectWorldBounds accumulates parent offset for group children (P1-02/P1-C3)', () => {
      const wb = collectWorldBounds(offsetGroupConfig().symbols, 0, 0);
      const byId = new Map(wb.map((b) => [b.id, b] as const));
      // top-level outside-dev: world == local (no parent).
      expect(byId.get('outside-dev')).toEqual({ id: 'outside-dev', x: 50, y: 50, width: 40, height: 40 });
      // group: world (300,200).
      expect(byId.get('grp-1')!.x).toBe(300);
      expect(byId.get('grp-1')!.y).toBe(200);
      // dev-in-group: local (10,10) + group offset (300,200) = world (310,210).
      expect(byId.get('dev-in-group')).toEqual({ id: 'dev-in-group', x: 310, y: 210, width: 80, height: 60 });
      // nested-junction: local (120,20) + group offset (300,200) = world (420,220).
      expect(byId.get('nested-junction')!.x).toBe(420);
      expect(byId.get('nested-junction')!.y).toBe(220);
    });
  });

  it('offset-group connection-list shows nested connection (P1-C4 dangling false positive fix)', async () => {
    const { container } = renderEditor('list-conn', offsetGroupConfig());
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    const all = handle.connection.listConnections();
    expect(all).toHaveLength(1);
    // nested connection target 'dev-in-group' exists (in the group) → not dangling.
    expect(all[0].connection.target).toBe('dev-in-group');
    expect(all[0].dangling).toBe(false);
    expect(all[0].junctionId).toBe('nested-junction');
  });

  it('selectionNodes resolves group-child multi-select (P1-C2 align no longer drops grouped children)', async () => {
    const { container } = renderEditor('sel-nodes', offsetGroupConfig());
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    // align requires ≥ 2 nodes; both are inside the group. Pre-fix selectionNodes filtered top-level only
    // → returned [] → align reported insufficient-selection. Post-fix: recursive walker resolves both.
    handle.setSelection(['dev-in-group', 'nested-junction']);
    const ok = handle.toolbox.align('left');
    expect(ok).toBe(true);
    // both nodes' world x aligned to min — but align works on local x; we assert that align was able to
    // find 2 nodes (returned true) and at least one node's x changed.
    const symbols = handle.session.workingConfig.symbols;
    const grp = symbols.find((s) => s.id === 'grp-1')!;
    const dev = grp.children!.find((c) => c.id === 'dev-in-group')!;
    const jnc = grp.children!.find((c) => c.id === 'nested-junction')!;
    // align left picks min x — both originally had x=10/120; aligning to 10 sets both to 10.
    expect(dev.x).toBe(10);
    expect(jnc.x).toBe(10);
  });

  it('computeBounds / fit not degenerate on grouped scene (P1-C3)', async () => {
    const { container } = renderEditor('fit-group', offsetGroupConfig());
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    // fit returns true iff computeBounds produced a non-empty bounds. Pre-fix groups carried
    // no width/height and children's world extent was ignored → fit returned false on a non-empty scene.
    expect(handle.toolbox.fit()).toBe(true);
    expect(handle.toolbox.center()).toBe(true);
  });

  it('nested junction connection x/y recomputed when target moves (P1-C1)', async () => {
    const { container } = renderEditor('nested-junction-linkage', offsetGroupConfig());
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;

    const before = handle.connection.listConnections().find((c) => c.connection.id === 'c1')!.connection;
    expect(before.x).toBeCloseTo(0.7, 5);
    expect(before.y).toBeCloseTo(0.5, 5);

    // move the target device inside the group; recomputeLinkagesForMovedNode is fired by updateSymbol
    // when geometry fields change (it now uses collectAllSymbols → reaches the nested junction).
    handle.updateSymbol('dev-in-group', { x: 200, y: 100 });

    const after = handle.connection.listConnections().find((c) => c.connection.id === 'c1')!.connection;
    // After move: dev-in-group world = group(300,200) + local(200,100) = (500,300). Anchor right-middle
    // of an 80x60 box → target world = (580, 330). junction world = group(300,200) + local(120,20) =
    // (420,220), size 50x50. normalized = (580-420)/50, (330-220)/50 = (3.2, 2.2). Must differ from 0.7/0.5.
    expect(after.x).not.toBeCloseTo(0.7, 2);
    expect(after.y).not.toBeCloseTo(0.5, 2);
    expect(after.x).toBeCloseTo(3.2, 2);
    expect(after.y).toBeCloseTo(2.2, 2);
  });

  it('group id monotonic + collision-free across same-millisecond double group (P1-D)', async () => {
    const { container } = renderEditor('group-id', {
      version: 1,
      variables: [],
      symbols: [
        { id: 'r1', type: 'scada-rect', x: 0, y: 0, width: 50, height: 50 },
        { id: 'r2', type: 'scada-rect', x: 100, y: 0, width: 50, height: 50 },
        { id: 'r3', type: 'scada-rect', x: 200, y: 0, width: 50, height: 50 },
        { id: 'r4', type: 'scada-rect', x: 300, y: 0, width: 50, height: 50 },
      ],
    });
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    // two group operations in immediate succession (Date.now()-based id would collide in same ms).
    handle.group(['r1', 'r2']);
    handle.group(['r3', 'r4']);
    const groups = handle.session.workingConfig.symbols.filter((s) => s.type === 'scada-group');
    expect(groups).toHaveLength(2);
    const ids = groups.map((g) => g.id);
    // unique ids, both follow the monotonic counter format.
    expect(new Set(ids).size).toBe(2);
    expect(ids.every((id) => id.startsWith('scada-group-'))).toBe(true);
    // counter is monotonic — second id number > first.
    const num = (id: string) => Number(id.replace('scada-group-', ''));
    expect(num(ids[1])).toBeGreaterThan(num(ids[0]));
  });

  it('group id collision guard: pre-existing scada-group-N id does not get reused', async () => {
    // seed config already contains a group with the id the counter would naturally produce next.
    const { container } = renderEditor('group-id-collision', {
      version: 1,
      variables: [],
      symbols: [
        { id: 'scada-group-1', type: 'scada-group', x: 0, y: 0, children: [] },
        { id: 'r1', type: 'scada-rect', x: 0, y: 0, width: 50, height: 50 },
        { id: 'r2', type: 'scada-rect', x: 100, y: 0, width: 50, height: 50 },
      ],
    });
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    handle.group(['r1', 'r2']);
    const groups = handle.session.workingConfig.symbols.filter((s) => s.type === 'scada-group');
    // The original 'scada-group-1' + the new group (must not collide with it).
    expect(groups.length).toBeGreaterThanOrEqual(2);
    const ids = groups.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('scada-group-1');
    // new id != scada-group-1.
    const newId = ids.find((id) => id !== 'scada-group-1')!;
    expect(newId).not.toBe('scada-group-1');
    expect(newId.startsWith('scada-group-')).toBe(true);
  });

  it('copy/paste on grouped-child selection resolves nested nodes (P1-C2 clipboard path)', async () => {
    const { container } = renderEditor('grouped-copy', offsetGroupConfig());
    const cid = await waitForReadyAndCid(container);
    const handle = readScadaEditorTestHandle(cid)!;
    // select two children inside the group; pre-fix selectionNodes returned [] → copy returned 0.
    handle.setSelection(['dev-in-group', 'nested-junction']);
    const n = handle.toolbox.copy();
    expect(n).toBe(2);
    const cb = handle.toolbox.getClipboard();
    expect(cb!.symbols).toHaveLength(2);
    // sanity: paste still works (returns new ids).
    const newIds = handle.toolbox.paste();
    expect(newIds.length).toBe(2);
  });
});
