import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from '../test-support.js';

afterEach(() => {
  cleanup();
});

const formulaCompiler = createFormulaCompiler();

const treeOptions = [
  {
    label: 'Fruit',
    value: 'fruit',
    children: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
    ],
  },
  {
    label: 'Veg',
    value: 'veg',
    children: [{ label: 'Carrot', value: 'carrot' }],
  },
];

function renderSchema(schema: object) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
    ...formAdvancedRendererDefinitions,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://component-handles-tree"
      schema={schema as any}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function formStateText(path: string): string {
  return screen.getByTestId(`form-state:${path}`).textContent ?? '';
}

describe('tree component handles: clear/focus', () => {
  it('component:clear empties input-tree selection (multi-select)', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { tags: ['apple', 'banana'] },
      body: [
        {
          type: 'input-tree',
          id: 'tree',
          name: 'tags',
          label: 'Tags',
          treeMode: 'checkbox',
          options: treeOptions,
        },
        {
          type: 'button',
          label: 'ClearBtn',
          onClick: { action: 'component:clear', componentId: 'tree' },
        },
        { type: 'form-state-probe', name: 'tags' },
      ],
    });

    fireEvent.click(screen.getByText('ClearBtn'));
    await waitFor(() => expect(formStateText('tags')).toBe('[]'));
  });

  it('component:focus focuses input-tree control', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { tags: [] },
      body: [
        {
          type: 'input-tree',
          id: 'tree',
          name: 'tags',
          label: 'Tags',
          treeMode: 'checkbox',
          options: treeOptions,
        },
        {
          type: 'button',
          label: 'FocusBtn',
          onClick: { action: 'component:focus', componentId: 'tree' },
        },
      ],
    });

    fireEvent.click(screen.getByText('FocusBtn'));
    await waitFor(() => {
      const control = document.querySelector('[data-slot="input-tree-control"]');
      expect(control).toBeTruthy();
      expect(control!.contains(document.activeElement) || document.activeElement === control).toBe(true);
    });
  });

  it('component:clear empties tree-select selection', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { pick: 'apple' },
      body: [
        {
          type: 'tree-select',
          id: 'ts',
          name: 'pick',
          label: 'Pick',
          treeMode: 'single',
          options: treeOptions,
        },
        {
          type: 'button',
          label: 'ClearBtn',
          onClick: { action: 'component:clear', componentId: 'ts' },
        },
        { type: 'form-state-probe', name: 'pick' },
      ],
    });

    fireEvent.click(screen.getByText('ClearBtn'));
    await waitFor(() => expect(formStateText('pick')).toBe('null'));
  });

  it('component:focus focuses tree-select trigger', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { pick: '' },
      body: [
        {
          type: 'tree-select',
          id: 'ts',
          name: 'pick',
          label: 'Pick',
          treeMode: 'single',
          options: treeOptions,
        },
        {
          type: 'button',
          label: 'FocusBtn',
          onClick: { action: 'component:focus', componentId: 'ts' },
        },
      ],
    });

    fireEvent.click(screen.getByText('FocusBtn'));
    await waitFor(() => {
      const control = document.querySelector('[data-slot="tree-select-control"]');
      expect(control).toBeTruthy();
      expect(control!.contains(document.activeElement) || document.activeElement === control).toBe(true);
    });
  });
});
