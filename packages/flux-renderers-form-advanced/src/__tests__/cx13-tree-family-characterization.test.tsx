import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

/**
 * CX-13 (plan 591) Phase 1 characterization pins — input-tree /
 * tree-select dual-renderer behavior matrix. Leg B (tree-controls twin
 * absorption) must keep every pin here green:
 *
 *   face        | input-tree                          | tree-select
 *   ------------+-------------------------------------+------------------------------
 *   render      | options visible in inline list      | trigger + popover option list
 *   select      | radio pick writes value             | popover pick writes + closes
 *   source      | error span + loading id chain       | error span + loading id chain
 *   clearable   | clear-row above options (→ undefined)| clear button in trigger row (→ '')
 *   enableNodePath | path-label values via valuePathMap | path-label values via valuePathMap
 *
 * The clear affordances and the popover/sheet trigger are the per-site
 * divergent render structures Leg B must NOT flatten; the pins above keep
 * both sides observable.
 */

installFormAdvancedTestHooks();

const allFormDefs = [
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
  formStateProbeRenderer,
];

afterEach(() => cleanup());

function renderForm(body: Record<string, unknown>[], data: Record<string, unknown> = {}) {
  const SchemaRenderer = createSchemaRenderer(allFormDefs);
  return render(
    <SchemaRenderer
      schemaUrl={`test://cx13-tree-family-characterization#${body.map((item) => item.type).join('+')}`}
      schema={
        {
          type: 'form',
          data,
          body,
        } as React.ComponentProps<typeof SchemaRenderer>['schema']
      }
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function probeValue(name: string): unknown {
  return JSON.parse(screen.getByTestId(`form-state:${name}`).textContent ?? 'null');
}

describe('CX-13 input-tree pins', () => {
  it('render + select: options are visible inline and a radio pick writes the value', async () => {
    renderForm(
      [
        {
          type: 'input-tree',
          name: 'category',
          label: 'Category',
          options: [
            {
              label: 'Platform',
              value: 'platform',
              children: [{ label: 'Runtime', value: 'runtime' }],
            },
          ],
        },
        { type: 'form-state-probe', name: 'category' },
      ],
      { category: '' },
    );

    expect(screen.getByRole('tree', { name: 'Category' })).toBeTruthy();
    expect(screen.getByRole('treeitem', { name: 'Platform' })).toBeTruthy();

    fireEvent.click(screen.getByRole('treeitem', { name: 'Runtime' }));

    await waitFor(() => {
      expect(probeValue('category')).toBe('runtime');
    });
  });

  it('clearable: clear-row renders above the options with a selection and clears to undefined', async () => {
    renderForm(
      [
        {
          type: 'input-tree',
          name: 'category',
          label: 'Category',
          clearable: true,
          options: [{ label: 'Platform', value: 'platform' }],
        },
        { type: 'form-state-probe', name: 'category' },
      ],
      { category: 'platform' },
    );

    const clearRow = document.querySelector('[data-slot="input-tree-clear-row"]');
    expect(clearRow).toBeTruthy();
    const clearButton = document.querySelector('[data-slot="input-tree-clear"]');
    expect(clearButton).toBeTruthy();

    fireEvent.click(clearButton as HTMLElement);

    await waitFor(() => {
      expect(probeValue('category')).toBeNull();
    });
    expect(document.querySelector('[data-slot="input-tree-clear-row"]')).toBeNull();
  });

  it('source: optionsSourceState error surfaces through the error span and aria chain', () => {
    renderForm([
      {
        type: 'input-tree',
        name: 'category',
        label: 'Category',
        options: [{ label: 'Static', value: 'static' }],
        optionsSourceState: { status: 'error', error: 'boom' },
      },
    ]);

    const errorSpan = document.querySelector('[data-slot="input-tree-source-error"]');
    expect(errorSpan).toBeTruthy();
    expect(errorSpan?.textContent).toBe('boom');
    const tree = screen.getByRole('tree', { name: 'Category' });
    expect(tree.getAttribute('aria-invalid')).toBe('true');
  });

  it('source: loading state publishes the per-name loading description id', () => {
    renderForm([
      {
        type: 'input-tree',
        name: 'category',
        label: 'Category',
        options: [{ label: 'Static', value: 'static' }],
        optionsSourceState: { loading: true },
      },
    ]);

    expect(screen.getByText('Loading...')).toBeTruthy();
    const loadingSpan = document.querySelector('[data-slot="input-tree-source-loading"]');
    expect(loadingSpan).toBeTruthy();
    expect(loadingSpan?.id).toBe('category-source-loading');
    expect(screen.getByRole('tree', { name: 'Category' }).getAttribute('aria-describedby')).toBe(
      'category-source-loading',
    );
  });

  it('enableNodePath: picks publish the valuePathMap path label instead of the leaf value', async () => {
    renderForm(
      [
        {
          type: 'input-tree',
          name: 'category',
          label: 'Category',
          enableNodePath: true,
          options: [
            {
              label: 'Platform',
              value: 'platform',
              children: [{ label: 'Runtime', value: 'runtime' }],
            },
          ],
        },
        { type: 'form-state-probe', name: 'category' },
      ],
      { category: '' },
    );

    fireEvent.click(screen.getByRole('treeitem', { name: 'Runtime' }));

    await waitFor(() => {
      expect(probeValue('category')).toBe('platform/runtime');
    });
  });
});

describe('CX-13 tree-select pins', () => {
  it('render + select: trigger opens the popover, a pick writes the value and closes it', async () => {
    renderForm(
      [
        {
          type: 'tree-select',
          name: 'department',
          label: 'Department',
          options: [
            {
              label: 'Engineering',
              value: 'eng',
              children: [{ label: 'Platform', value: 'platform' }],
            },
          ],
        },
        { type: 'form-state-probe', name: 'department' },
      ],
      { department: '' },
    );

    const trigger = screen.getByRole('button', { name: /Department/ });
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger);

    fireEvent.click(await screen.findByRole('treeitem', { name: 'Platform' }));

    await waitFor(() => {
      expect(probeValue('department')).toBe('platform');
    });
    await waitFor(() => {
      expect(screen.queryByRole('treeitem', { name: 'Platform' })).toBeNull();
    });
  });

  it('clearable: clear button in the trigger row clears the selection', async () => {
    renderForm(
      [
        {
          type: 'tree-select',
          name: 'department',
          label: 'Department',
          clearable: true,
          options: [{ label: 'Platform', value: 'platform' }],
        },
        { type: 'form-state-probe', name: 'department' },
      ],
      { department: 'platform' },
    );

    const clearButton = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(probeValue('department')).toBe('');
    });
  });

  it('source: optionsSourceState error surfaces through the error span and aria chain', async () => {
    renderForm([
      {
        type: 'tree-select',
        name: 'department',
        label: 'Department',
        options: [{ label: 'Static', value: 'static' }],
        optionsSourceState: { status: 'error', error: 'boom' },
      },
    ]);

    const errorSpan = document.querySelector('[data-slot="tree-select-source-error"]');
    expect(errorSpan).toBeTruthy();
    expect(errorSpan?.textContent).toBe('boom');
  });

  it('source: loading state publishes the per-name loading description id', async () => {
    renderForm([
      {
        type: 'tree-select',
        name: 'department',
        label: 'Department',
        options: [{ label: 'Static', value: 'static' }],
        optionsSourceState: { loading: true },
      },
    ]);

    await waitFor(() => {
      const loadingSpan = document.querySelector('[data-slot="tree-select-source-loading"]');
      expect(loadingSpan).toBeTruthy();
      expect(loadingSpan?.id).toBe('department-source-loading');
    });
  });

  it('enableNodePath: picks publish the valuePathMap path label instead of the leaf value', async () => {
    renderForm(
      [
        {
          type: 'tree-select',
          name: 'department',
          label: 'Department',
          enableNodePath: true,
          options: [
            {
              label: 'Engineering',
              value: 'eng',
              children: [{ label: 'Platform', value: 'platform' }],
            },
          ],
        },
        { type: 'form-state-probe', name: 'department' },
      ],
      { department: '' },
    );

    fireEvent.click(screen.getByRole('button', { name: /Department/ }));
    fireEvent.click(await screen.findByRole('treeitem', { name: 'Platform' }));

    await waitFor(() => {
      expect(probeValue('department')).toBe('eng/platform');
    });
  });
});
