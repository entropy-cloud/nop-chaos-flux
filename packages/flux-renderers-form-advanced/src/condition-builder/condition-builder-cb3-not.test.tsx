import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { env, formStateProbeRenderer } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';
import { sanitizeNode } from './utils.js';
import { renderGroup } from './config-test-support.js';

// B6.1 CB3 regression lock:
// - showNot renders a NOT toggle on EVERY group, including groups added at runtime.
// - Toggling NOT writes `value.not` on that specific group.
// - `not` survives the sanitize / AMIS-conversion roundtrip.

const allDefs = [
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
  formStateProbeRenderer,
];

function readFormValue(): unknown {
  return JSON.parse(screen.getByTestId('form-state:filters').textContent ?? 'null');
}

describe('CB3: showNot on runtime-added groups', () => {
  it('a group added at runtime also shows a NOT toggle, and toggling it writes value.not on the new group', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/cb3-runtime-not"
        schema={
          {
            type: 'form',
            data: {
              filters: { id: 'root', conjunction: 'and', children: [] },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                showNot: true,
                builderMode: 'full',
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
              },
              { type: 'form-state-probe', name: 'filters' },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    // Root group already renders one NOT toggle.
    await screen.findByText('Add group');
    expect(screen.queryAllByText('NOT')).toHaveLength(1);

    // Add a nested group at runtime.
    fireEvent.click(screen.getByText('Add group'));

    await waitFor(() => {
      // The newly added group must ALSO render a NOT toggle (same schema => showNot honored).
      expect(screen.queryAllByText('NOT')).toHaveLength(2);
    });

    // Toggle the runtime-added group's NOT (the second NOT button is the nested group).
    fireEvent.click(screen.queryAllByText('NOT')[1]);

    await waitFor(() => {
      const value = readFormValue() as { children: Array<{ not?: boolean }> };
      const nested = value.children.find((c) => 'children' in c) as { not?: boolean } | undefined;
      expect(nested?.not).toBe(true);
    });
  });
});

describe('CB3: not survives serialization roundtrip (sanitize + AMIS conversion)', () => {
  it('sanitizeNode preserves `not` on a group and nested groups', () => {
    const input = {
      id: 'g1',
      conjunction: 'and' as const,
      not: true,
      children: [
        { id: 'g2', conjunction: 'or' as const, not: true, children: [] },
        { id: 'i1', left: { type: 'field' as const, field: 'name' }, op: 'equal', right: undefined },
      ],
    };

    const sanitized = sanitizeNode(input) as typeof input;
    expect(sanitized.not).toBe(true);
    const sanitizedNested = sanitized.children[0] as { not?: boolean };
    expect(sanitizedNested.not).toBe(true);
  });

  it('internal-format value with not:true renders the active NOT state', () => {
    renderGroup(
      { showNot: true, showAndOr: true },
      { id: 'g1', conjunction: 'and', not: true, children: [] },
    );
    expect(screen.queryAllByText('NOT ✓').length).toBeGreaterThanOrEqual(1);
  });

  it('AMIS-format input with not:true is converted and rendered with the active NOT state (root + nested)', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/cb3-amis-not"
        schema={
          {
            type: 'form',
            data: {
              // AMIS shape: combinator/rules + not. toGroupValue routes this through
              // convertAmisRule, which must carry `not` through to the internal tree.
              filters: {
                combinator: 'and',
                not: true,
                rules: [
                  { combinator: 'or', not: true, rules: [] },
                ],
              },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                showNot: true,
                builderMode: 'full',
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
              },
              { type: 'form-state-probe', name: 'filters' },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    // Both the root group and the nested AMIS rule carried `not:true` through conversion.
    await waitFor(() => {
      expect(screen.queryAllByText('NOT ✓').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('write-back roundtrip: toggling NOT off removes the active state and writes not back through the form', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/cb3-writeback"
        schema={
          {
            type: 'form',
            data: {
              filters: { id: 'root', conjunction: 'and', not: true, children: [] },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                showNot: true,
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
              },
              { type: 'form-state-probe', name: 'filters' },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await screen.findAllByText('NOT ✓');
    fireEvent.click(screen.getAllByText('NOT ✓')[0]);

    await waitFor(() => {
      const value = readFormValue() as { not?: boolean };
      expect(value.not).toBeFalsy();
    });
  });
});
