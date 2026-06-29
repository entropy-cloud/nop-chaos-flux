import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RendererComponentProps, RendererDefinition, ScopeRef } from '@nop-chaos/flux-core';
import { useRenderScope } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { env, formStateProbeRenderer } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';

// Records the projected scope reference handed to the custom value editor on
// each render, so the test can assert it is stable across re-renders (H30).
const recordedScopes: ScopeRef[] = [];

const ScopeIdentityProbeRenderer = (_props: RendererComponentProps) => {
  const scope = useRenderScope();
  recordedScopes.push(scope);
  return <div data-testid="scope-identity-probe" />;
};

const scopeIdentityProbeDefinition: RendererDefinition = {
  type: 'scope-identity-probe',
  component: ScopeIdentityProbeRenderer,
};

const allDefs = [
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
  scopeIdentityProbeDefinition,
  formStateProbeRenderer,
];

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

describe('condition-builder projected form/scope stability (H30)', () => {
  it('keeps the projected scope reference stable across re-renders', async () => {
    cleanup();
    recordedScopes.length = 0;
    const SchemaRenderer = createSchemaRenderer(allDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://condition-builder-projected-stability#1"
        schema={
          {
            type: 'form',
            data: {
              filters: {
                id: 'root',
                conjunction: 'and',
                children: [
                  { id: 'item-1', left: { type: 'field', field: 'probe' }, op: 'equal', right: 'x' },
                  { id: 'item-2', left: { type: 'field', field: 'note' }, op: 'equal', right: 'hello' },
                ],
              },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                fields: [
                  {
                    name: 'probe',
                    label: 'Probe',
                    type: 'custom',
                    operators: ['equal'],
                    value: { type: 'scope-identity-probe', name: 'value' },
                  },
                  { name: 'note', label: 'Note', type: 'text' },
                ],
              },
              { type: 'form-state-probe', name: 'filters' },
            ],
          } as never
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('scope-identity-probe')).toBeTruthy();
    });
    expect(recordedScopes.length).toBeGreaterThanOrEqual(1);
    const firstScope = recordedScopes[0];
    expect(firstScope).toBeTruthy();

    // Edit item-2's value — the condition-builder re-renders (effectiveValue is
    // rebuilt), confirmed by the form-state probe updating. Item-1's projected
    // scope must remain the SAME reference (no per-render churn).
    const noteInput = screen.getByDisplayValue('hello') as HTMLInputElement;
    fireEvent.change(noteInput, { target: { value: 'world' } });

    await waitFor(() => {
      const state = resolveFormState('form-state:filters') as { children: { right: unknown }[] };
      expect(state.children[1].right).toBe('world');
    });

    // Every recorded scope handed to item-1's editor is the same reference — the
    // projection cache (keyed by item id, live-read via ref) eliminated churn.
    expect(recordedScopes.length).toBeGreaterThanOrEqual(1);
    expect(new Set(recordedScopes).size).toBe(1);
    expect(recordedScopes[recordedScopes.length - 1]).toBe(firstScope);
  });
});
