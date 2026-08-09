import { describe, expect, it } from 'vitest';
import { createEditorCore, type EditorCore } from '@nop-chaos/editor-core';
import {
  applyDashboardDiff,
  createDashboardDomainAdapter,
  diffDashboardDocument,
  emptyDashboardDocument,
  type DashboardDocument,
  type DashboardLayoutDiff,
} from './dashboard-domain-adapter.js';
import type { DashboardPanelSchema } from '../schemas.js';

const panel = (id: string, overrides: Partial<DashboardPanelSchema> = {}): DashboardPanelSchema => ({
  id,
  type: 'chart',
  x: 0,
  y: 0,
  w: 4,
  h: 2,
  ...overrides,
});

describe('dashboard diff round-trip symmetry (forward/inverse)', () => {
  it('patches only changed fields and restores them exactly', () => {
    const prev: DashboardDocument = {
      panels: [panel('a', { x: 1, title: 'A' }), panel('b', { x: 5 })],
    };
    const next: DashboardDocument = {
      panels: [panel('a', { x: 3, title: 'A2' }), panel('b', { x: 5 })],
    };
    const forward = diffDashboardDocument(prev, next) as DashboardLayoutDiff;
    expect(Object.keys(forward.patches)).toEqual(['a']);
    expect(forward.added).toEqual([]);
    expect(forward.removed).toEqual([]);

    const applied = applyDashboardDiff(prev, forward);
    expect(applied).toEqual(next);
    const back = applyDashboardDiff(next, diffDashboardDocument(next, prev) as DashboardLayoutDiff);
    expect(back).toEqual(prev);
  });

  it('removes and restores panels at their original indices', () => {
    const prev: DashboardDocument = {
      panels: [panel('r1', { x: 0 }), panel('r2', { x: 1 }), panel('x', { x: 2 })],
    };
    const next: DashboardDocument = { panels: [panel('x', { x: 2 }), panel('a', { x: 3 })] };
    const forward = diffDashboardDocument(prev, next) as DashboardLayoutDiff;
    expect(forward.removed.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(forward.added.map((a) => a.panel.id)).toEqual(['a']);

    expect(applyDashboardDiff(prev, forward)).toEqual(next);
    const back = applyDashboardDiff(next, diffDashboardDocument(next, prev) as DashboardLayoutDiff);
    expect(back).toEqual(prev);
  });

  it('returns null for structurally identical documents', () => {
    const doc: DashboardDocument = { panels: [panel('a')] };
    expect(diffDashboardDocument(doc, { panels: [{ ...panel('a') }] })).toBeNull();
  });

  it('combines patches, removals and additions in one round trip', () => {
    const prev: DashboardDocument = {
      panels: [panel('a', { x: 0 }), panel('gone', { x: 4 }), panel('b', { x: 6 })],
    };
    const next: DashboardDocument = {
      panels: [panel('a', { x: 2, w: 6 }), panel('new', { x: 8, type: 'table' }), panel('b', { x: 6 })],
    };
    const forward = diffDashboardDocument(prev, next) as DashboardLayoutDiff;
    expect(applyDashboardDiff(prev, forward)).toEqual(next);
    const back = applyDashboardDiff(next, diffDashboardDocument(next, prev) as DashboardLayoutDiff);
    expect(back).toEqual(prev);
  });
});

describe('dashboard domain adapter integration with editor-core', () => {
  it('records one diff per update and replays undo/redo (drag → undo → coords restored)', () => {
    const core = createEditorCore(createDashboardDomainAdapter(), {
      initialDocument: {
        panels: [panel('a', { x: 1, y: 2 }), panel('b', { x: 4 })],
      },
    });
    core.update((doc) => dragPanels(doc, 'a', { x: 5, y: 6 }));
    expect(core.getState().undoDepth).toBe(1);
    expect(core.getState().working.panels[0]).toMatchObject({ id: 'a', x: 5, y: 6 });

    core.undo();
    expect(core.getState().working.panels[0]).toMatchObject({ id: 'a', x: 1, y: 2 });
    core.redo();
    expect(core.getState().working.panels[0]).toMatchObject({ id: 'a', x: 5, y: 6 });
  });

  it('transaction coalesces drag updates into one undo entry and commit keeps the stack', () => {
    const core = createEditorCore(createDashboardDomainAdapter(), {
      initialDocument: { panels: [panel('a', { x: 0, y: 0 })] },
    });
    core.beginTransaction();
    for (let i = 1; i <= 4; i += 1) {
      core.update((doc) => dragPanels(doc, 'a', { x: i, y: i }));
    }
    expect(core.getState().undoDepth).toBe(0);
    expect(core.endTransaction()).toBe(true);
    expect(core.getState().undoDepth).toBe(1);

    const commit = core.commit();
    expect(commit.ok).toBe(true);
    expect(core.getState().committed.panels[0]).toMatchObject({ id: 'a', x: 4, y: 4 });
    expect(core.getState().canUndo).toBe(true);
    core.undo();
    expect(core.getState().working.panels[0]).toMatchObject({ id: 'a', x: 0, y: 0 });
  });

  it('serialize produces the layout panels JSON for downstream sync', () => {
    const core = createEditorCore(createDashboardDomainAdapter(), {
      initialDocument: { panels: [panel('a', { x: 1, title: 'KPI' })] },
    });
    const result = core.commit();
    expect(result.serialized).toBe(
      JSON.stringify([panel('a', { x: 1, title: 'KPI' })]),
    );
  });

  it('selection is pruned when the selected panel is removed', () => {
    const core = createEditorCore(createDashboardDomainAdapter(), {
      initialDocument: { panels: [panel('a'), panel('b')] },
      selection: ['a', 'b'],
    });
    core.update((doc) => ({ panels: doc.panels.filter((p) => p.id !== 'a') }));
    expect(core.getState().selection).toEqual(['b']);
  });

  it('reject-invalid commit keeps working (adapter validate gate)', () => {
    const adapter = createDashboardDomainAdapter();
    const core: EditorCore<DashboardDocument, DashboardLayoutDiff> = createEditorCore(adapter, {
      initialDocument: { panels: [panel('a')] },
    });
    core.update((doc) => ({ panels: [{ ...doc.panels[0], x: Number.NaN }] }));
    const result = core.commit();
    expect(result.ok).toBe(false);
    expect(core.getState().dirty).toBe(true);
  });
});

function dragPanels(
  doc: DashboardDocument,
  id: string,
  position: { x: number; y: number },
): DashboardDocument {
  return {
    panels: doc.panels.map((p) => (p.id === id ? { ...p, x: position.x, y: position.y } : p)),
  };
}

void emptyDashboardDocument;
