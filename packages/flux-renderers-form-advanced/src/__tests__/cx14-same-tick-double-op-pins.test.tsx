import React from 'react';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer, useCurrentComponentRegistry } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { baseEnv, formulaCompiler, formStateProbeRenderer } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

/**
 * CX-14 (plan 592) Phase 1 — G2 same-tick double-operation pins (NEW pins;
 * the plan's baseline records that no same-tick double-op case existed
 * anywhere in the repo, so the wording "port" was corrected to "newly
 * authored"). Expectations are DERIVED from the live code and verified
 * empirically; each cell documents the mechanism it pins.
 *
 * Instrument: two real click dispatches (or two capability invokes) inside a
 * single React `act` scope — no commit may land between the two operations,
 * so both run against the same committed render snapshot ("same tick").
 *
 * Cells (plan G2):
 *   (i)    UI double-add — combo/input-table handleAdd writes the SNAPSHOT
 *          array `[...itemsArray, {}]` twice via setValue, so the second write
 *          REPLACES the first: one add is LOST. array-editor/key-value UI adds
 *          live-append via appendValue, so both adds land (sub-faction —
 *          derived, pinned per container). compatAppend fires unconditionally
 *          per invocation (twice), advancing the compat key counter — the key
 *          drift is source-level fact (compatAppend precedes every write); the
 *          keys resync to the item count on the post-tick render.
 *   (ii)   capability double-add — appendValue live-appends, so BOTH land and
 *          BOTH invokes return the STALE pre-add index (render snapshot).
 *   (iii)  double-remove across the minItems-guard asymmetry — key-value's
 *          handler has NO handler-level minItems gate and reads pairsRef
 *          fresh, so an in-tick double remove drives THROUGH the floor;
 *          combo/input-table's handlers carry the guard but their guard reads
 *          the stale snapshot, and removeValue clamps indexes — the observed
 *          end state per container is pinned below.
 *   (iv)   mixed add+remove in one tick — pinned per container.
 */

installFormAdvancedTestHooks();

const capture: {
  registry?: { resolve: (t: { componentId?: string }) => unknown };
} = {};

function RegistryCaptureRenderer() {
  const registry = useCurrentComponentRegistry();
  React.useEffect(() => {
    capture.registry = registry as typeof capture.registry;
  });
  return null;
}

const SchemaRenderer = createSchemaRenderer([
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
  formStateProbeRenderer,
  { type: 'registry-capture', component: RegistryCaptureRenderer },
]);

afterEach(() => cleanup());

function resolveArrayValues(testId: string): Array<Record<string, unknown>> {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? [];
}

function sameTickClicks(element: Element, times = 2): void {
  act(() => {
    for (let i = 0; i < times; i += 1) {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  });
}

function sameTickCapabilityInvokes(
  componentId: string,
  method: string,
  payload: Record<string, unknown> | undefined,
  times = 2,
): Array<{ ok: boolean; skipped?: boolean; code?: string; data?: { index?: number } }> {
  const results: Array<{ ok: boolean; skipped?: boolean; code?: string; data?: { index?: number } }> = [];
  act(() => {
    for (let i = 0; i < times; i += 1) {
      const resolved = capture.registry!.resolve({ componentId }) as {
        capabilities: { invoke: (m: string, p?: Record<string, unknown>, c?: unknown) => (typeof results)[number] };
      };
      results.push(resolved.capabilities.invoke(method, payload, {}));
    }
  });
  return results;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

function renderContainer(body: Record<string, unknown>[], data: Record<string, unknown>) {
  return render(
    <SchemaRenderer
      schemaUrl="test://cx14-same-tick"
      schema={{ type: 'form', data, body } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={baseEnv}
      formulaCompiler={formulaCompiler}
    />,
  );
}

// ── Cell (i): UI double-add in one tick ────────────────────────────────────

describe('G2 cell (i): UI double-add in one tick', () => {
  it('combo: second snapshot write REPLACES the first — one add is lost (length 2→3, not 4)', async () => {
    renderContainer(
      [
        {
          type: 'combo',
          name: 'lines',
          label: 'Lines',
          items: [{ type: 'input-text', name: 'name', placeholder: 'Name' }],
        },
        { type: 'form-state-probe', name: 'lines' },
      ],
      { lines: [{ name: 'a' }, { name: 'b' }] },
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:lines')).toHaveLength(2);
    });

    sameTickClicks(screen.getByText('Add item'));
    await settle();

    // two handleAdd runs: compatAppend twice (key counter +2) but the two
    // setValue([...snapshot, {}]) writes are last-wins — one add lost
    expect(resolveArrayValues('form-state:lines')).toHaveLength(3);
    // rows resync cleanly after the compat-key resync effect
    expect(document.querySelectorAll('[data-slot="combo-item"]')).toHaveLength(3);
  });

  it('input-table: second snapshot write REPLACES the first — one add is lost', async () => {
    renderContainer(
      [
        {
          type: 'input-table',
          name: 'rows',
          label: 'Rows',
          columns: [{ label: 'SKU' }],
          item: [{ type: 'input-text', name: 'sku', placeholder: 'SKU' }],
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
      { rows: [{ sku: 'a' }, { sku: 'b' }] },
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:rows')).toHaveLength(2);
    });

    sameTickClicks(screen.getByText('Add row'));
    await settle();

    expect(resolveArrayValues('form-state:rows')).toHaveLength(3);
  });

  it('array-editor: UI add live-appends via appendValue — BOTH adds land (sub-faction)', async () => {
    renderContainer(
      [
        { type: 'array-editor', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer' },
        { type: 'form-state-probe', name: 'reviewers' },
      ],
      {
        reviewers: [
          { id: 'item-1', value: 'a' },
          { id: 'item-2', value: 'b' },
        ],
      },
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:reviewers')).toHaveLength(2);
    });

    sameTickClicks(screen.getByText('Add item'));
    await settle();

    const items = resolveArrayValues('form-state:reviewers');
    expect(items).toHaveLength(4);
  });

  it('key-value: UI add live-appends via appendValue — BOTH adds land (sub-faction)', async () => {
    renderContainer(
      [
        { type: 'key-value', name: 'metadata', label: 'Metadata' },
        { type: 'form-state-probe', name: 'metadata' },
      ],
      {
        metadata: [
          { id: 'pair-1', key: 'a', value: '1' },
          { id: 'pair-2', key: 'b', value: '2' },
        ],
      },
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:metadata')).toHaveLength(2);
    });

    sameTickClicks(screen.getByText('Add entry'));
    await settle();

    expect(resolveArrayValues('form-state:metadata')).toHaveLength(4);
  });
});

// ── Cell (ii): capability double-add in one tick ───────────────────────────

describe('G2 cell (ii): capability double-add in one tick — both land, stale pre-add index twice', () => {
  it('combo: two invokes append both entries and return the same stale index', async () => {
    renderContainer(
      [
        {
          type: 'combo',
          id: 'c',
          name: 'lines',
          label: 'Lines',
          items: [{ type: 'input-text', name: 'name', placeholder: 'Name' }],
        },
        { type: 'registry-capture' },
        { type: 'form-state-probe', name: 'lines' },
      ],
      { lines: [{ name: 'a' }, { name: 'b' }] },
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:lines')).toHaveLength(2);
    });

    const results = sameTickCapabilityInvokes('c', 'addItem', {});
    expect(results).toEqual([
      { ok: true, data: { index: 2 } },
      { ok: true, data: { index: 2 } },
    ]);
    await waitFor(() => {
      expect(resolveArrayValues('form-state:lines')).toHaveLength(4);
    });
  });

  it('input-table: two invokes append both rows and return the same stale index', async () => {
    renderContainer(
      [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          label: 'Rows',
          columns: [{ label: 'SKU' }],
          item: [{ type: 'input-text', name: 'sku', placeholder: 'SKU' }],
        },
        { type: 'registry-capture' },
        { type: 'form-state-probe', name: 'rows' },
      ],
      { rows: [{ sku: 'a' }, { sku: 'b' }] },
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:rows')).toHaveLength(2);
    });

    const results = sameTickCapabilityInvokes('t', 'addItem', {});
    expect(results).toEqual([
      { ok: true, data: { index: 2 } },
      { ok: true, data: { index: 2 } },
    ]);
    await waitFor(() => {
      expect(resolveArrayValues('form-state:rows')).toHaveLength(4);
    });
  });

  it('array-editor: two invokes append both items and return the same stale index', async () => {
    renderContainer(
      [
        { type: 'array-editor', id: 'arr', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer' },
        { type: 'registry-capture' },
        { type: 'form-state-probe', name: 'reviewers' },
      ],
      { reviewers: [{ id: 'item-1', value: 'a' }] },
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:reviewers')).toHaveLength(1);
    });

    const results = sameTickCapabilityInvokes('arr', 'addItem', {});
    expect(results).toEqual([
      { ok: true, data: { index: 1 } },
      { ok: true, data: { index: 1 } },
    ]);
    await waitFor(() => {
      expect(resolveArrayValues('form-state:reviewers')).toHaveLength(3);
    });
  });

  it('key-value: two invokes append both pairs and return the same stale index', async () => {
    renderContainer(
      [
        { type: 'key-value', id: 'kv', name: 'metadata', label: 'Metadata' },
        { type: 'registry-capture' },
        { type: 'form-state-probe', name: 'metadata' },
      ],
      { metadata: [{ id: 'pair-1', key: 'a', value: '1' }] },
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:metadata')).toHaveLength(1);
    });

    const results = sameTickCapabilityInvokes('kv', 'addItem', {});
    expect(results).toEqual([
      { ok: true, data: { index: 1 } },
      { ok: true, data: { index: 1 } },
    ]);
    await waitFor(() => {
      expect(resolveArrayValues('form-state:metadata')).toHaveLength(3);
    });
  });
});

// ── Cell (iii): double-remove across the minItems-guard asymmetry ──────────

describe('G2 cell (iii): same-tick double-remove from floor+1 (minItems 1, two items)', () => {
  it('combo: stale-snapshot guard passes on both runs; clamped removeValue drives below the floor (observed: 2 → 0)', async () => {
    renderContainer(
      [
        {
          type: 'combo',
          name: 'lines',
          label: 'Lines',
          minItems: 1,
          items: [{ type: 'input-text', name: 'name', placeholder: 'Name' }],
        },
        { type: 'form-state-probe', name: 'lines' },
      ],
      { lines: [{ name: 'a' }, { name: 'b' }] },
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:lines')).toHaveLength(2);
    });

    sameTickClicks(document.querySelectorAll('[data-slot="combo-remove"]')[0]);
    await settle();

    // Both handler runs execute: the minItems guard reads the STALE snapshot
    // (2 items) on the second run and passes; removeValue(name, 0) clamps onto
    // the shrunk live array. Observed end state pinned as-is.
    expect(resolveArrayValues('form-state:lines')).toHaveLength(0);
  });

  it('input-table: same stale-guard + clamp drive-through (observed: 2 → 0)', async () => {
    renderContainer(
      [
        {
          type: 'input-table',
          name: 'rows',
          label: 'Rows',
          minItems: 1,
          columns: [{ label: 'SKU' }],
          item: [{ type: 'input-text', name: 'sku', placeholder: 'SKU' }],
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
      { rows: [{ sku: 'a' }, { sku: 'b' }] },
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:rows')).toHaveLength(2);
    });

    sameTickClicks(document.querySelectorAll('[data-slot="input-table-remove"]')[0]);
    await settle();

    expect(resolveArrayValues('form-state:rows')).toHaveLength(0);
  });

  it('array-editor: no handler guard — removeValue runs twice (observed: 2 → 0)', async () => {
    renderContainer(
      [
        { type: 'array-editor', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer', minItems: 1 },
        { type: 'form-state-probe', name: 'reviewers' },
      ],
      {
        reviewers: [
          { id: 'item-1', value: 'a' },
          { id: 'item-2', value: 'b' },
        ],
      },
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:reviewers')).toHaveLength(2);
    });

    sameTickClicks(screen.getByRole('button', { name: 'Remove Reviewer 1' }));
    await settle();

    expect(resolveArrayValues('form-state:reviewers')).toHaveLength(0);
  });

  it('key-value: no handler guard + fresh pairsRef read — both removes fully effective (observed: 2 → 0, floor breached in-tick)', async () => {
    renderContainer(
      [
        { type: 'key-value', name: 'metadata', label: 'Metadata', minItems: 1 },
        { type: 'form-state-probe', name: 'metadata' },
      ],
      {
        metadata: [
          { id: 'pair-1', key: 'a', value: '1' },
          { id: 'pair-2', key: 'b', value: '2' },
        ],
      },
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:metadata')).toHaveLength(2);
    });

    sameTickClicks(screen.getByRole('button', { name: 'Remove entry 1' }));
    await settle();

    // key-value reads pairsRef FRESH on the second run (pairsRef.current was
    // synchronously reassigned by the first), so the second remove filters the
    // already-shrunk snapshot — the minItems floor is breached in-tick.
    expect(resolveArrayValues('form-state:metadata')).toHaveLength(0);
  });
});

// ── Cell (iv): mixed add + remove in one tick ──────────────────────────────

describe('G2 cell (iv): mixed add + remove in one tick', () => {
  it('combo: add write survives (live state), then remove(0) runs against it — the ORIGINAL first item is what disappears', async () => {
    renderContainer(
      [
        {
          type: 'combo',
          name: 'lines',
          label: 'Lines',
          items: [{ type: 'input-text', name: 'name', placeholder: 'Name' }],
        },
        { type: 'form-state-probe', name: 'lines' },
      ],
      { lines: [{ name: 'a' }, { name: 'b' }] },
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:lines')).toHaveLength(2);
    });

    act(() => {
      screen.getByText('Add item').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      document
        .querySelectorAll('[data-slot="combo-remove"]')[0]
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await settle();

    // add: setValue([a, b, {}]); remove(0): removeValue(0) on the live
    // [a, b, {}] drops 'a'. The add survives; the original head is removed.
    const items = resolveArrayValues('form-state:lines');
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe('b');
    expect(items[1]).toEqual({});
  });

  it('key-value: add lands via pairsRef+appendValue, remove(0) reads the fresh ref — the ORIGINAL first entry disappears', async () => {
    renderContainer(
      [
        { type: 'key-value', name: 'metadata', label: 'Metadata' },
        { type: 'form-state-probe', name: 'metadata' },
      ],
      {
        metadata: [
          { id: 'pair-1', key: 'a', value: '1' },
          { id: 'pair-2', key: 'b', value: '2' },
        ],
      },
    );
    await waitFor(() => {
      expect(resolveArrayValues('form-state:metadata')).toHaveLength(2);
    });

    act(() => {
      screen.getByText('Add entry').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      screen
        .getByRole('button', { name: 'Remove entry 1' })
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await settle();

    const pairs = resolveArrayValues('form-state:metadata');
    expect(pairs).toHaveLength(2);
    expect(pairs[0].key).toBe('b');
    expect(pairs[1].key).toBe('');
    expect(pairs[1].value).toBe('');
  });
});
