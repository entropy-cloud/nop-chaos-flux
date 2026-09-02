import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { dataRendererDefinitions } from '@nop-chaos/flux-renderers-data';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formulaCompiler } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];
const allDefs = [...basicRendererDefinitions, ...allFormDefs, ...dataRendererDefinitions];

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function renderSchema(schema: object) {
  const SchemaRenderer = createSchemaRenderer([...allDefs]);
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
  it('picker dialog list content exposes accessible item names', async () => {
    renderSchema({
      type: 'form',
      body: [
        {
          type: 'picker',
          name: 'owner',
          label: 'Owner',
          pickerPopup: { title: 'Pick owner' },
          pickerSchema: {
            type: 'list',
            items: [{ label: 'Alice', value: 'alice' }],
            item: {
              type: 'button',
              label: '${item.label}',
              onClick: { action: 'pick', args: { value: '${item.value}', rows: '${item}' } },
            },
          },
        },
      ],
    });

    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
    const itemButton = await screen.findByRole('button', { name: 'Alice' });
    expect(itemButton).toBeTruthy();
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
