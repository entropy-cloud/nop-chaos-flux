import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { baseEnv, formulaCompiler, formStateProbeRenderer } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

/**
 * CX-14 (plan 592) Phase 1 drift pins — the per-container divergences the
 * useArrayContainerController absorption must preserve as PARAMETERS (zero
 * declared behavior change):
 *
 *   1. minItems default factions — 0-faction (combo / input-table: unset means
 *      floor 0, no minItems rule pushed) vs 1-faction (array-editor /
 *      key-value: unset means floor 1 AND a default minItems=1 rule is
 *      pushed); the 1-faction array-editor face is already pinned at
 *      array-keyvalue-min-max-reorder.test.tsx:97 — the key-value default
 *      floor, the 0-faction remove-to-empty faces, and the collectRules faces
 *      are pinned here.
 *   2. add validate depth — combo/input-table UI add calls validateSubtree
 *      while every capability add routes through writeFieldValue
 *      (validateField, CX-11 G4 surface). The asymmetry is behaviorally
 *      VISIBLE on the root minItems rule: after a UI add the
 *      "must contain at least N item(s)" error is surfaced on change; after
 *      a capability add it is not. array-editor/key-value route BOTH paths
 *      through writeFieldValue (field-depth on both) — pinned as the shared
 *      silent face.
 *   3. remove-validate gate factions — combo/input-table/array-editor gate
 *      the post-remove validateSubtree on shouldValidateOn; key-value
 *      validates UNCONDITIONALLY. Witness (still-violating protocol): with
 *      validateOn ['submit'] and a seeded maxItems violation surfaced by
 *      submit, the removal mutation ITSELF clears the root error (runtime
 *      mechanics, all four). Seeding FOUR items against maxItems 2 keeps the
 *      array violating after one removal: the gated trio keeps the error
 *      gone (no revalidation ran) while key-value RE-SURFACES it
 *      (revalidation ran). The array-editor change-gate toggle proves only
 *      the gate differs.
 *   4. removeWhen gating faces — combo capability removeItem must be blocked
 *      for removeWhen-falsy rows (input-table face already pinned in
 *      input-table-remove-when.test.tsx; this is the combo gap). Note: the
 *      HANDLER-level isRemoveBlockedAt re-check (combo-only, plan baseline ④)
 *      is defense-in-depth that is pre-empted by the shared
 *      ArrayItemActionButtons button guard in every reachable DOM state —
 *      the button guard reads the same removeBlocked source — so the
 *      handler-gate asymmetry has no button-level behavioral witness; the
 *      capability face below is the reachable contract.
 *   5. focus-restore trigger scope — array-editor restores focus on add AND
 *      remove (pinned in array-editor-row-editing.test.tsx); key-value
 *      restores on REMOVE ONLY — adding an entry must not steal focus
 *      (pinned here, previously unpinned).
 */

installFormAdvancedTestHooks();

const SchemaRenderer = createSchemaRenderer([
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
  formStateProbeRenderer,
]);

afterEach(() => cleanup());

function renderForm(body: Record<string, unknown>[], extra: Record<string, unknown> = {}) {
  return render(
    <SchemaRenderer
      schemaUrl="test://cx14-fadv-drift-pins"
      schema={
        {
          type: 'form',
          ...extra,
          body,
        } as React.ComponentProps<typeof SchemaRenderer>['schema']
      }
      env={baseEnv}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function resolveArrayValues(testId: string): Array<Record<string, unknown>> {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? [];
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 40));

// ── 1. minItems default factions ───────────────────────────────────────────

describe('CX-14 minItems default factions', () => {
  it('0-faction combo: last item is removable (floor 0, no configured minItems)', async () => {
    renderForm(
      [
        {
          type: 'combo',
          name: 'lines',
          label: 'Lines',
          items: [{ type: 'input-text', name: 'name', placeholder: 'Name' }],
        },
        { type: 'form-state-probe', name: 'lines' },
      ],
      { data: { lines: [{ name: 'only' }] } },
    );

    const removeButton = document.querySelector('[data-slot="combo-remove"]') as HTMLButtonElement;
    expect(removeButton).toBeTruthy();
    expect(removeButton.disabled).toBe(false);

    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(resolveArrayValues('form-state:lines')).toEqual([]);
    });
  });

  it('0-faction input-table: last row is removable (floor 0, no configured minItems)', async () => {
    renderForm(
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
      { data: { rows: [{ sku: 'only' }] } },
    );

    const removeButton = document.querySelector('[data-slot="input-table-remove"]') as HTMLButtonElement;
    expect(removeButton).toBeTruthy();
    expect(removeButton.disabled).toBe(false);

    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(resolveArrayValues('form-state:rows')).toEqual([]);
    });
  });

  it('1-faction key-value: default floor is 1 — remove disabled at a single entry with NO minItems configured (default-floor face complementing the :97 array-editor pin)', () => {
    renderForm([{ type: 'key-value', name: 'metadata', label: 'Metadata' }], {
      data: { metadata: [{ id: 'pair-1', key: 'env', value: 'prod' }] },
    });

    const removeButton = screen.getByRole('button', { name: /^Remove entry \d+$/ }) as HTMLButtonElement;
    expect(removeButton.disabled).toBe(true);

    const addButton = screen.getByText('Add entry') as HTMLButtonElement;
    expect(addButton.disabled).toBe(false);
  });

  it('collectRules factions — submit with an EMPTY array and no minItems: combo/input-table raise no minItems error (rule not pushed)', async () => {
    const { rerender } = renderForm(
      [
        {
          type: 'combo',
          name: 'items0',
          label: 'Items0',
          items: [{ type: 'input-text', name: 'name', placeholder: 'Name' }],
        },
        { type: 'button', label: 'Submit', onClick: { action: 'submitForm' } },
      ],
      { validateOn: ['submit'], data: { items0: [] } },
    );
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => {
      expect(screen.queryByText(/must contain at least/)).toBeNull();
    });

    rerender(
      <SchemaRenderer
        schemaUrl="test://cx14-fadv-drift-pins"
        schema={
          {
            type: 'form',
            validateOn: ['submit'],
            data: { items0: [] },
            body: [
              {
                type: 'input-table',
                name: 'items0',
                label: 'Items0',
                columns: [{ label: 'SKU' }],
                item: [{ type: 'input-text', name: 'sku', placeholder: 'SKU' }],
              },
              { type: 'button', label: 'Submit', onClick: { action: 'submitForm' } },
            ],
          } as React.ComponentProps<typeof SchemaRenderer>['schema']
        }
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => {
      expect(screen.queryByText(/must contain at least/)).toBeNull();
    });
  });

  it('collectRules factions — 1-faction default rule: array-editor/key-value submit with an empty array demands at least 1 item', async () => {
    const { rerender } = renderForm(
      [
        { type: 'array-editor', name: 'items0', label: 'Items0', itemLabel: 'Item' },
        { type: 'button', label: 'Submit', onClick: { action: 'submitForm' } },
      ],
      { validateOn: ['submit'], data: { items0: [] } },
    );
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => {
      expect(screen.getByText(/must contain at least 1 item\(s\)/)).toBeTruthy();
    });

    rerender(
      <SchemaRenderer
        schemaUrl="test://cx14-fadv-drift-pins"
        schema={
          {
            type: 'form',
            validateOn: ['submit'],
            data: { items0: [] },
            body: [
              { type: 'key-value', name: 'items0', label: 'Items0' },
              { type: 'button', label: 'Submit', onClick: { action: 'submitForm' } },
            ],
          } as React.ComponentProps<typeof SchemaRenderer>['schema']
        }
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => {
      expect(screen.getByText(/must contain at least 1 item\(s\)/)).toBeTruthy();
    });
  });
});

// ── 2. add validate depth ──────────────────────────────────────────────────

describe('CX-14 add validate-depth faces', () => {
  const COMBO_BODY = [
    {
      type: 'combo',
      name: 'lines',
      label: 'Lines',
      minItems: 2,
      items: [{ type: 'input-text', name: 'name', placeholder: 'Name' }],
    },
    { type: 'form-state-probe', name: 'lines' },
  ];

  it('combo UI add evaluates the root minItems rule on change (shared face of the subtree call)', async () => {
    renderForm(COMBO_BODY, { validateOn: ['change'], data: { lines: [] } });
    fireEvent.click(screen.getByText('Add item'));
    await waitFor(() => {
      expect(screen.getByText(/must contain at least 2 item\(s\)/)).toBeTruthy();
    });
  });

  it('combo capability addItem does NOT surface the root minItems error (validateField face of the UI-subtree vs capability-field asymmetry)', async () => {
    renderForm(
      [
        {
          type: 'combo',
          id: 'c',
          name: 'lines',
          label: 'Lines',
          minItems: 2,
          items: [{ type: 'input-text', name: 'name', placeholder: 'Name' }],
        },
        { type: 'button', label: 'AddBtn', onClick: { action: 'component:addItem', componentId: 'c' } },
        { type: 'button', label: 'Submit', onClick: { action: 'submitForm' } },
        { type: 'form-state-probe', name: 'lines' },
      ],
      { validateOn: ['change'], data: { lines: [] } },
    );
    fireEvent.click(screen.getByText('AddBtn'));
    await waitFor(() => {
      expect(resolveArrayValues('form-state:lines')).toHaveLength(1);
    });
    await settle();
    // capability path validates FIELD depth via writeFieldValue — the root
    // minItems error is not surfaced (UI add surfaces it; the asymmetry face)
    expect(screen.queryByText(/must contain at least 2 item\(s\)/)).toBeNull();
    // the rule itself is alive: submit surfaces it
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => {
      expect(screen.getByText(/must contain at least 2 item\(s\)/)).toBeTruthy();
    });
  });

  it('input-table UI add evaluates the root minItems rule on change (cx11 complement)', async () => {
    renderForm(
      [
        {
          type: 'input-table',
          name: 'rows',
          label: 'Rows',
          minItems: 2,
          columns: [{ label: 'SKU' }],
          item: [{ type: 'input-text', name: 'sku', placeholder: 'SKU' }],
        },
        { type: 'form-state-probe', name: 'rows' },
      ],
      { validateOn: ['change'], data: { rows: [] } },
    );
    fireEvent.click(screen.getByText('Add row'));
    await waitFor(() => {
      expect(screen.getByText(/must contain at least 2 item\(s\)/)).toBeTruthy();
    });
  });

  it('input-table capability addItem does NOT surface the root minItems error (validateField face, mirroring combo)', async () => {
    renderForm(
      [
        {
          type: 'input-table',
          id: 't',
          name: 'rows',
          label: 'Rows',
          minItems: 2,
          columns: [{ label: 'SKU' }],
          item: [{ type: 'input-text', name: 'sku', placeholder: 'SKU' }],
        },
        { type: 'button', label: 'AddBtn', onClick: { action: 'component:addItem', componentId: 't' } },
        { type: 'button', label: 'Submit', onClick: { action: 'submitForm' } },
        { type: 'form-state-probe', name: 'rows' },
      ],
      { validateOn: ['change'], data: { rows: [] } },
    );
    fireEvent.click(screen.getByText('AddBtn'));
    await waitFor(() => {
      expect(resolveArrayValues('form-state:rows')).toHaveLength(1);
    });
    await settle();
    expect(screen.queryByText(/must contain at least 2 item\(s\)/)).toBeNull();
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => {
      expect(screen.getByText(/must contain at least 2 item\(s\)/)).toBeTruthy();
    });
  });

  it('array-editor UI add is writeFieldValue field-depth — no child-required error surfaces on add', async () => {
    renderForm(
      [{ type: 'array-editor', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer' }],
      { validateOn: ['change'], data: { reviewers: [{ id: 'item-1', value: 'ok' }] } },
    );
    fireEvent.click(screen.getByText('Add item'));
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText(/^Reviewer \d+$/)).toHaveLength(2);
    });
    await settle();
    expect(screen.queryByText(/is required/)).toBeNull();
  });

  it('key-value UI add is writeFieldValue field-depth — no child-required error surfaces on add', async () => {
    renderForm([{ type: 'key-value', name: 'metadata', label: 'Metadata' }], {
      validateOn: ['change'],
      data: { metadata: [{ id: 'pair-1', key: 'k', value: 'v' }] },
    });
    fireEvent.click(screen.getByText('Add entry'));
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('Key')).toHaveLength(2);
    });
    await settle();
    expect(screen.queryByText(/is required/)).toBeNull();
  });
});

// ── 3. remove-validate gate factions ───────────────────────────────────────

/**
 * Witness protocol (empirically derived): validateOn ['submit'] + a seeded
 * maxItems violation made visible by an explicit submit; then remove one row.
 * The structural mutation ITSELF clears the root error (runtime mechanics,
 * all four containers). With 4 seeded items and maxItems 2 the array is STILL
 * violating after one removal, so the two factions diverge:
 *   - gated trio (combo / input-table / array-editor): the post-remove
 *     validateSubtree is gated off by shouldValidateOn → no revalidation →
 *     the error stays GONE despite the ongoing violation;
 *   - key-value (no gate): validateSubtree runs unconditionally → the error
 *     RE-APPEARS.
 * The array-editor change-gate toggle proves only the gate differs.
 */
describe('CX-14 remove-validate gate factions (shouldValidateOn ×3 vs key-value always)', () => {
  it('key-value remove re-validates UNCONDITIONALLY — cleared maxItems error RE-APPEARS while the array still violates maxItems', async () => {
    renderForm(
      [
        { type: 'key-value', name: 'metadata', label: 'Metadata', maxItems: 2 },
        { type: 'button', label: 'Submit', onClick: { action: 'submitForm' } },
        { type: 'form-state-probe', name: 'metadata' },
      ],
      {
        validateOn: ['submit'],
        data: {
          metadata: [
            { id: 'pair-1', key: 'a', value: '1' },
            { id: 'pair-2', key: 'b', value: '2' },
            { id: 'pair-3', key: 'c', value: '3' },
            { id: 'pair-4', key: 'd', value: '4' },
          ],
        },
      },
    );
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => {
      expect(screen.getByText(/must contain at most 2 item\(s\)/)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove entry 1' }));
    await waitFor(() => {
      expect(resolveArrayValues('form-state:metadata')).toHaveLength(3);
    });
    await settle();
    // still violating (3 > 2) and the error is back: validation ran on remove
    expect(screen.getByText(/must contain at most 2 item\(s\)/)).toBeTruthy();
  });

  it('combo remove is GATED — with the array still violating maxItems the cleared error stays gone (no revalidation) under validateOn [submit]', async () => {
    renderForm(
      [
        {
          type: 'combo',
          name: 'lines',
          label: 'Lines',
          maxItems: 2,
          items: [{ type: 'input-text', name: 'name', placeholder: 'Name' }],
        },
        { type: 'button', label: 'Submit', onClick: { action: 'submitForm' } },
        { type: 'form-state-probe', name: 'lines' },
      ],
      {
        validateOn: ['submit'],
        data: { lines: [{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }] },
      },
    );
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => {
      expect(screen.getByText(/must contain at most 2 item\(s\)/)).toBeTruthy();
    });

    fireEvent.click(document.querySelectorAll('[data-slot="combo-remove"]')[0]);
    await waitFor(() => {
      expect(resolveArrayValues('form-state:lines')).toHaveLength(3);
    });
    await settle();
    // gated: mutation cleared the error, no revalidation recomputes it — even
    // though the array STILL violates maxItems (3 > 2)
    expect(screen.queryByText(/must contain at most 2 item\(s\)/)).toBeNull();
  });

  it('input-table remove is GATED — cleared maxItems error stays gone despite the ongoing violation under validateOn [submit]', async () => {
    renderForm(
      [
        {
          type: 'input-table',
          name: 'rows',
          label: 'Rows',
          maxItems: 2,
          columns: [{ label: 'SKU' }],
          item: [{ type: 'input-text', name: 'sku', placeholder: 'SKU' }],
        },
        { type: 'button', label: 'Submit', onClick: { action: 'submitForm' } },
        { type: 'form-state-probe', name: 'rows' },
      ],
      {
        validateOn: ['submit'],
        data: { rows: [{ sku: 'a' }, { sku: 'b' }, { sku: 'c' }, { sku: 'd' }] },
      },
    );
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => {
      expect(screen.getByText(/must contain at most 2 item\(s\)/)).toBeTruthy();
    });

    fireEvent.click(document.querySelectorAll('[data-slot="input-table-remove"]')[0]);
    await waitFor(() => {
      expect(resolveArrayValues('form-state:rows')).toHaveLength(3);
    });
    await settle();
    expect(screen.queryByText(/must contain at most 2 item\(s\)/)).toBeNull();
  });

  it('array-editor remove is GATED — cleared maxItems error stays gone despite the ongoing violation under validateOn [submit]', async () => {
    renderForm(
      [
        { type: 'array-editor', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer', maxItems: 2 },
        { type: 'button', label: 'Submit', onClick: { action: 'submitForm' } },
        { type: 'form-state-probe', name: 'reviewers' },
      ],
      {
        validateOn: ['submit'],
        data: {
          reviewers: [
            { id: 'item-1', value: 'a' },
            { id: 'item-2', value: 'b' },
            { id: 'item-3', value: 'c' },
            { id: 'item-4', value: 'd' },
          ],
        },
      },
    );
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => {
      expect(screen.getByText(/must contain at most 2 item\(s\)/)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove Reviewer 1' }));
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText(/^Reviewer \d+$/)).toHaveLength(3);
    });
    await settle();
    expect(screen.queryByText(/must contain at most 2 item\(s\)/)).toBeNull();
  });

  it('array-editor gate toggle: with validateOn [change] the SAME removal re-validates and the still-violating error RE-APPEARS (only the gate differs)', async () => {
    renderForm(
      [
        { type: 'array-editor', name: 'reviewers', label: 'Reviewers', itemLabel: 'Reviewer', maxItems: 2 },
        { type: 'button', label: 'Submit', onClick: { action: 'submitForm' } },
        { type: 'form-state-probe', name: 'reviewers' },
      ],
      {
        validateOn: ['change'],
        data: {
          reviewers: [
            { id: 'item-1', value: 'a' },
            { id: 'item-2', value: 'b' },
            { id: 'item-3', value: 'c' },
            { id: 'item-4', value: 'd' },
          ],
        },
      },
    );
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => {
      expect(screen.getByText(/must contain at most 2 item\(s\)/)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove Reviewer 1' }));
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText(/^Reviewer \d+$/)).toHaveLength(3);
    });
    await settle();
    expect(screen.getByText(/must contain at most 2 item\(s\)/)).toBeTruthy();
  });
});

// ── 4. removeWhen capability face (combo gap) ──────────────────────────────

describe('CX-14 removeWhen capability face — combo (mirrors the input-table pin)', () => {
  it('component:removeItem handle is blocked for combo rows where removeWhen is falsy', async () => {
    renderForm(
      [
        {
          type: 'combo',
          id: 'c',
          name: 'lines',
          label: 'Lines',
          items: [
            { type: 'input-text', name: 'name', placeholder: 'Name' },
            { type: 'input-text', name: 'locked', placeholder: 'Locked' },
          ],
          removeWhen: '${value.locked !== "true"}',
        },
        {
          type: 'button',
          label: 'RemoveBtn',
          onClick: { action: 'component:removeItem', componentId: 'c', args: { index: 0 } },
        },
        { type: 'form-state-probe', name: 'lines' },
      ],
      { data: { lines: [{ name: 'persisted', locked: 'true' }] } },
    );

    await waitFor(() => {
      expect(resolveArrayValues('form-state:lines')).toHaveLength(1);
    });

    fireEvent.click(screen.getByText('RemoveBtn'));

    await waitFor(() => {
      expect(resolveArrayValues('form-state:lines')).toEqual([{ name: 'persisted', locked: 'true' }]);
    });
  });
});

// ── 5. focus-restore trigger scope — key-value is remove-only ──────────────

describe('CX-14 focus-restore trigger scope', () => {
  it('key-value add does NOT steal focus (remove-only faction — array-editor add-focus is pinned in array-editor-row-editing.test.tsx)', async () => {
    renderForm([{ type: 'key-value', name: 'metadata', label: 'Metadata' }], {
      data: { metadata: [{ id: 'pair-1', key: 'env', value: 'prod' }] },
    });

    const keyInput = screen.getByPlaceholderText('Key') as HTMLInputElement;
    keyInput.focus();
    expect(document.activeElement).toBe(keyInput);

    fireEvent.click(screen.getByText('Add entry'));

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('Key')).toHaveLength(2);
    });
    expect(document.activeElement).toBe(keyInput);
  });
});
