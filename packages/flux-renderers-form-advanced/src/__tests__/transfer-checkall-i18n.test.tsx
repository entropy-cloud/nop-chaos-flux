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
      schemaUrl="test://transfer-checkall-i18n"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

describe('transfer: toggle-all aria-label contract (C3.1 P2-1)', () => {
  it('defaults to the localized label when checkAllLabel is not provided', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { roles: [] },
      body: [
        {
          type: 'transfer',
          id: 'tr',
          name: 'roles',
          label: 'Roles',
          options: [{ label: 'Admin', value: 'admin' }],
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Select all')).toBeTruthy();
    });
    expect(
      document.querySelector('[data-slot="transfer-toggle-all"]')?.getAttribute('aria-label'),
    ).toBe('Select all');
  });

  it('uses the authored checkAllLabel when provided', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { roles: [] },
      body: [
        {
          type: 'transfer',
          id: 'tr',
          name: 'roles',
          label: 'Roles',
          checkAllLabel: 'Select every role',
          options: [{ label: 'Admin', value: 'admin' }],
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Select every role')).toBeTruthy();
    });
    expect(
      document.querySelector('[data-slot="transfer-toggle-all"]')?.getAttribute('aria-label'),
    ).toBe('Select every role');
  });

  it('toggle-all selects all candidates and the field writes them on move', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { roles: [] },
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
        },
        { type: 'form-state-probe', name: 'roles' },
      ],
    });

    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-slot="transfer-option-candidate"]'),
      ).toHaveLength(3);
    });

    fireEvent.click(document.querySelector('[data-slot="transfer-toggle-all"]')!);
    fireEvent.click(document.querySelector('[data-slot="transfer-select"]')!);

    await waitFor(() => {
      expect(resolveFormState('form-state:roles')).toEqual(['admin', 'editor', 'viewer']);
    });
  });
});

export {};
