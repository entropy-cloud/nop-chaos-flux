import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions, arrayFieldRendererDefinition } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createPathBinding } from '@nop-chaos/flux-core';
import { env, formulaCompiler } from '../test-support.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

function renderSchema(schema: object) {
  const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);
  return render(
    <SchemaRenderer
      schemaUrl="test://b32-v6-row-relative"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('array-field: row-local relative cross-field addressing is NOT supported (B3.2 V6 裁定 B)', () => {
  it('array-field getChildFieldPathPrefix returns false (item children are not part of the static compiled validation model)', () => {
    // This is the compile-time contract that makes row-local relative cross-field
    // addressing an unmodeled gap: item children are validated through the
    // projected per-item form runtime registration, NOT through the parent
    // owner's static compiled validation graph. There is no per-row path-binding
    // context that would let a relative sibling name resolve to the current row.
    expect(arrayFieldRendererDefinition.validation?.getChildFieldPathPrefix?.({} as never, {} as never)).toBe(false);
  });

  it('path-binding only models a STATIC owner root; it cannot represent per-index row instances', () => {
    // createPathBinding takes a fixed ownerRootPath (object/detail/variant
    // projected-owner rebasing). Array rows are dynamic per-index
    // (`${arrayPath}.${i}`) and are intentionally NOT represented here.
    const binding = createPathBinding({ ownerRootPath: 'items.0' });
    expect(binding.toAbsolute('sku')).toBe('items.0.sku');
    // A different row index is not "owned" by this static binding — confirming
    // there is no row-instance path-binding service for relative rebase.
    expect(binding.owns('items.1.sku')).toBe(false);
    expect(binding.toRelative('items.1.sku')).toBeUndefined();
  });

  it('a row-local cross-field rule does not act as a per-row sibling check (no row-local enforcement)', async () => {
    // Author intent (row-local): each row's `a` should equal that row's `b`.
    // Here row 0 has a !== b, so a row-local `equalsField: 'b'` would flag it.
    // Flux contract (裁定 B): because item children are not in the static
    // validation model and there is no row-instance path binding, the relative
    // cross-field rule is NOT enforced as a per-row sibling check. Authors must
    // use absolute index-addressed paths; row-local relative addressing is a
    // documented successor (roadmap B7), not a live capability.
    renderSchema({
      type: 'form',
      id: 'f',
      showErrorOn: ['touched', 'submit'],
      data: {
        rows: [{ a: 'X', b: 'Y' }],
      },
      body: [
        {
          type: 'array-field',
          name: 'rows',
          itemKind: 'object',
          item: [
            { type: 'input-text', name: 'a', label: 'RowA', equalsField: 'b' },
            { type: 'input-text', name: 'b', label: 'RowB' },
          ],
        },
      ],
    });

    await waitFor(() => expect(screen.getAllByLabelText('RowA')).toHaveLength(1));

    // Touch + blur the field, then submit to force every validation path.
    const aInput = screen.getByLabelText('RowA');
    fireEvent.focus(aInput);
    fireEvent.blur(aInput);

    // No row-local `equalsField` error is produced for the mismatched row,
    // locking the current "row-local relative addressing is not modeled" behavior.
    await waitFor(() => {
      expect(document.querySelectorAll('[data-slot="field-error"]').length).toBe(0);
    });

    cleanup();
  });
});

export {};
