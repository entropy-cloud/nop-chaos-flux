import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formulaCompiler } from '../test-support.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function renderSchema(schema: object) {
  const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...allFormDefs]);
  return render(
    <SchemaRenderer
      schemaUrl="test://searchbox-a11y"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('searchbox accessible names (a11y Phase 2)', () => {
  it('picker dialog search input exposes an accessible name', () => {
    renderSchema({
      type: 'form',
      body: [
        {
          type: 'picker',
          name: 'owner',
          label: 'Owner',
          pickerDialog: { title: 'Pick owner' },
          options: [{ label: 'Alice', value: 'alice' }],
        },
      ],
    });

    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
    const searchbox = screen.getByRole('searchbox');
    expect(searchbox.getAttribute('aria-label')).toBeTruthy();
  });

  it('icon-picker search input exposes an accessible name', () => {
    renderSchema({
      type: 'form',
      body: [{ type: 'icon-picker', name: 'icon' }],
    });

    fireEvent.click(document.querySelector('[data-slot="icon-picker-trigger"]')!);
    const searchbox = screen.getByRole('searchbox');
    expect(searchbox.getAttribute('aria-label')).toBeTruthy();
  });
});
