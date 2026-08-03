import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formStateProbeRenderer, formulaCompiler } from '../test-support.js';

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
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://transfer-on-select-all"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

describe('transfer: onSelectAll event (C3.1 P1-1)', () => {
  it('fires onSelectAll when the toggle-all checkbox selects all candidates', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { roles: [], selectAllFlag: false },
      body: [
        {
          type: 'transfer',
          id: 'tr',
          name: 'roles',
          label: 'Roles',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
          ],
          onSelectAll: { action: 'setValue', args: { path: 'selectAllFlag', value: true } },
        },
        { type: 'form-state-probe', name: 'roles' },
        { type: 'form-state-probe', name: 'selectAllFlag' },
      ],
    });

    await waitFor(() => {
      expect(resolveFormState('form-state:selectAllFlag')).toBe(false);
    });

    fireEvent.click(document.querySelector('[data-slot="transfer-toggle-all"]')!);

    await waitFor(() => {
      expect(resolveFormState('form-state:selectAllFlag')).toBe(true);
    });
    // Selecting all also moves the full candidate set into the checked state.
    expect(resolveFormState('form-state:roles')).toEqual([]);
  });

  it('fires onSelectAll when completing a partial selection via toggle-all', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { roles: [], selectAllFlag: false },
      body: [
        {
          type: 'transfer',
          id: 'tr',
          name: 'roles',
          label: 'Roles',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
            { label: 'Viewer', value: 'viewer' },
          ],
          onSelectAll: { action: 'setValue', args: { path: 'selectAllFlag', value: true } },
        },
        { type: 'form-state-probe', name: 'selectAllFlag' },
      ],
    });

    await waitFor(() => {
      expect(document.querySelectorAll('[data-slot="transfer-option-candidate"]')).toHaveLength(3);
    });

    // Check one candidate manually, then toggle-all completes the set.
    const candidateChecks = document.querySelectorAll<HTMLInputElement>(
      '[data-slot="transfer-option-candidate"]',
    );
    fireEvent.click(candidateChecks[0]);
    fireEvent.click(document.querySelector('[data-slot="transfer-toggle-all"]')!);

    await waitFor(() => {
      expect(resolveFormState('form-state:selectAllFlag')).toBe(true);
    });
  });
});

export {};
