import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { dataRendererDefinitions } from '@nop-chaos/flux-renderers-data';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formStateProbeRenderer, formulaCompiler } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

// v3.4 contract: the selected-values surface is the trigger's joined label —
// the per-tag UI (collapse popover / per-tag remove) is deferred to the picker
// tag-UI successor plan. These tests pin the honest current behaviour:
// overflowConfig is a declared prop, and no selection label is ever hidden.

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
      schemaUrl="test://picker-overflow-config"
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

function multiplePickerBody(overflowConfig?: Record<string, unknown>) {
  return {
    type: 'form',
    id: 'f',
    data: {
      owners: [
        { id: 'a', name: 'Alice' },
        { id: 'b', name: 'Bob' },
        { id: 'c', name: 'Carol' },
      ],
    },
    body: [
      {
        type: 'picker',
        id: 'pk',
        name: 'owners',
        label: 'Owners',
        multiple: true,
        valueField: 'id',
        labelField: 'name',
        ...(overflowConfig ? { overflowConfig } : {}),
        pickerPopup: { title: 'Pick owners' },
        pickerSchema: {
          type: 'list',
          items: [{ label: 'Dan', value: 'd' }],
          item: {
            type: 'button',
            label: '${item.label}',
            onClick: { action: 'pick', args: { value: '${item.value}', rows: '${item}' } },
          },
        },
      },
      { type: 'form-state-probe', name: 'owners' },
    ],
  };
}

function selectedLabel(): string {
  return screen.getByTestId('picker-selected-label').textContent ?? '';
}

describe('picker: overflowConfig multi-select label surface', () => {
  it('with overflowConfig.maxTagCount set, every selected label stays visible (nothing collapsed)', () => {
    renderSchema(multiplePickerBody({ maxTagCount: 1 }));

    expect(selectedLabel()).toBe('Alice, Bob, Carol');
    expect(selectedLabel()).not.toContain('+2');
  });

  it('without overflowConfig all selected labels are listed as well (parity baseline)', () => {
    renderSchema(multiplePickerBody());

    expect(selectedLabel()).toBe('Alice, Bob, Carol');
  });

  it('overflowConfig with overflowTagPopover is accepted and selection still round-trips', async () => {
    renderSchema(
      multiplePickerBody({ maxTagCount: 1, overflowTagPopover: { type: 'popover' } }),
    );
    expect(selectedLabel()).toBe('Alice, Bob, Carol');

    fireEvent.click(document.querySelector('[data-slot="picker-trigger"]')!);
    await screen.findByText('Pick owners');
    fireEvent.click(screen.getByRole('button', { name: 'Dan' }));
    fireEvent.click(document.querySelector('[data-slot="picker-confirm"]')!);

    await waitFor(() => {
      // Commit order: pick-triggered accumulation first, then scope-published keys.
      expect(JSON.parse(screen.getByTestId('form-state:owners').textContent ?? 'null')).toEqual([
        'd',
        'a',
        'b',
        'c',
      ]);
    });
  });
});

export {};
