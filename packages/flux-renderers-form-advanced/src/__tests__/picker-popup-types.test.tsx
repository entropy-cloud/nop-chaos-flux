import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { dataRendererDefinitions } from '@nop-chaos/flux-renderers-data';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formStateProbeRenderer, formulaCompiler } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function renderSchema(schema: object) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...allFormDefs,
    ...dataRendererDefinitions,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://picker-popup-types"
      schema={schema as never}
      env={{
        fetcher: async function <T>() {
          return { status: 0, data: null as T };
        },
        notify: () => undefined,
      }}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function pickerForm(pickerPopup: Record<string, unknown>) {
  return {
    type: 'form',
    id: 'f',
    data: { owner: undefined },
    body: [
      {
        type: 'picker',
        id: 'pk',
        name: 'owner',
        label: 'Owner',
        pickerPopup,
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
      { type: 'form-state-probe', name: 'owner' },
    ],
  };
}

describe('picker: pickerPopup.type selects the popup surface (dialog / drawer / popover)', () => {
  it('type dialog (default) renders the dialog surface with the title', async () => {
    renderSchema(pickerForm({ type: 'dialog', title: 'Dialog Pick' }));

    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
    await screen.findByText('Dialog Pick');
    expect(document.querySelector('[data-slot="picker-dialog-content"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="picker-drawer-content"]')).toBeNull();
    expect(document.querySelector('[data-slot="picker-popover-content"]')).toBeNull();
  });

  it('type drawer with placement right renders the drawer surface', async () => {
    renderSchema(pickerForm({ type: 'drawer', placement: 'right', title: 'Drawer Pick' }));

    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
    await screen.findByText('Drawer Pick');
    expect(document.querySelector('[data-slot="picker-drawer-content"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="picker-dialog-content"]')).toBeNull();
  });

  it('type popover with showMask false renders the popover surface', async () => {
    renderSchema(pickerForm({ type: 'popover', showMask: false, title: 'Popover Pick' }));

    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
    await screen.findByText('Popover Pick');
    expect(document.querySelector('[data-slot="picker-popover-content"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="picker-dialog-content"]')).toBeNull();
    expect(document.querySelector('[data-slot="picker-drawer-content"]')).toBeNull();
  });
});

export {};
