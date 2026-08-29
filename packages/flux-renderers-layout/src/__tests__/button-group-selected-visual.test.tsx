import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { createLayoutSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// [G1-视角3-03] (R2 consistency audit, P1): `selectionMode` emitted
// data-selected/aria-pressed but no selector consumed them — selecting an item
// produced zero visual feedback ("state emitted, style zero-consumed" family).

function renderGroup(schema: Record<string, unknown>) {
  const SchemaRenderer = createLayoutSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://button-group-selected-visual"
      schema={{ type: 'page', body: [schema as unknown as BaseSchema] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

afterEach(() => cleanup());

describe('[G1-视角3-03] button-group selection mode has a selected visual', () => {
  it('selected item carries the data-selected consumer classes', () => {
    renderGroup({
      type: 'button-group',
      selectionMode: 'single',
      items: [
        { key: 'a', label: 'Alpha' },
        { key: 'b', label: 'Beta' },
      ],
    });

    const alpha = screen.getByRole('button', { name: 'Alpha' });
    fireEvent.click(alpha);

    expect(alpha.getAttribute('data-selected')).not.toBeNull();
    // Family-2 contract: the state must have a selector consuming it.
    expect(alpha.className).toContain('data-selected:bg-accent');
    expect(alpha.className).toContain('data-selected:text-accent-foreground');
  });

  it('unselected items stay neutral (no regression)', () => {
    renderGroup({
      type: 'button-group',
      selectionMode: 'single',
      items: [
        { key: 'a', label: 'Alpha' },
        { key: 'b', label: 'Beta' },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));
    const beta = screen.getByRole('button', { name: 'Beta' });
    expect(beta.getAttribute('data-selected')).toBeNull();
    expect(beta.getAttribute('aria-pressed')).toBe('false');
  });
});
