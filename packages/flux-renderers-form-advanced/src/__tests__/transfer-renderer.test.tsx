// @vitest-environment happy-dom

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
      schemaUrl="test://transfer"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

function getOptionInput(kind: 'candidate' | 'selected', label: string): HTMLInputElement {
  const items = document.querySelectorAll(`[data-slot="transfer-option-${kind}"]`);
  const found = Array.from(items).find(
    (el) => (el as HTMLInputElement).getAttribute('aria-label') === label,
  );
  if (!found) {
    throw new Error(`option ${label} not found in ${kind}`);
  }
  return found as HTMLInputElement;
}

describe('transfer: shuttle selection + valueKey/labelKey normalization', () => {
  it('normalizes options with valueKey/labelKey and writes selected values back', async () => {
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
          valueKey: 'id',
          labelKey: 'title',
          options: [
            { id: 'admin', title: 'Admin' },
            { id: 'editor', title: 'Editor' },
          ],
        },
        { type: 'form-state-probe', name: 'roles' },
      ],
    });

    // candidate pane shows the labelKey-derived labels
    expect(getOptionInput('candidate', 'Admin')).toBeTruthy();
    expect(getOptionInput('candidate', 'Editor')).toBeTruthy();

    fireEvent.click(getOptionInput('candidate', 'Admin'));
    fireEvent.click(document.querySelector('[data-slot="transfer-select"]')!);

    await waitFor(() => {
      expect(resolveFormState('form-state:roles')).toEqual(['admin']);
    });
  });

  it('deselect moves a selected value back out of the field', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { roles: ['admin'] },
      body: [
        {
          type: 'transfer',
          id: 'tr',
          name: 'roles',
          label: 'Roles',
          valueKey: 'id',
          labelKey: 'title',
          options: [
            { id: 'admin', title: 'Admin' },
            { id: 'editor', title: 'Editor' },
          ],
        },
        { type: 'form-state-probe', name: 'roles' },
      ],
    });

    fireEvent.click(getOptionInput('selected', 'Admin'));
    fireEvent.click(document.querySelector('[data-slot="transfer-deselect"]')!);

    await waitFor(() => {
      expect(resolveFormState('form-state:roles')).toEqual([]);
    });
  });

  it('searchable filters the candidate pane', async () => {
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
          searchable: true,
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
            { label: 'Viewer', value: 'viewer' },
          ],
        },
        { type: 'form-state-probe', name: 'roles' },
      ],
    });

    const candidatePane = document.querySelector('[data-slot="transfer-pane-candidate"]')!;
    const search = candidatePane.querySelector('input[type="search"]') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'edit' } });

    await waitFor(() => {
      expect(() => getOptionInput('candidate', 'Admin')).toThrow();
      expect(getOptionInput('candidate', 'Editor')).toBeTruthy();
    });
  });

  it('empty options renders candidate empty state without crashing', () => {
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
          options: [],
        },
      ],
    });

    expect(document.querySelector('.nop-transfer')).toBeTruthy();
    expect(document.querySelectorAll('[data-slot="transfer-option-candidate"]')).toHaveLength(0);
  });

  it('selected value missing from candidates degrades to raw value label', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { roles: ['ghost'] },
      body: [
        {
          type: 'transfer',
          id: 'tr',
          name: 'roles',
          label: 'Roles',
          options: [{ label: 'Admin', value: 'admin' }],
        },
        { type: 'form-state-probe', name: 'roles' },
      ],
    });

    // ghost is not in candidates; selected pane should still show it (degraded label)
    expect(getOptionInput('selected', 'ghost')).toBeTruthy();
  });

  it('emits nop-transfer and pane markers', () => {
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

    expect(document.querySelector('.nop-transfer')).toBeTruthy();
    expect(document.querySelector('.nop-transfer__candidate')).toBeTruthy();
    expect(document.querySelector('.nop-transfer__selected')).toBeTruthy();
  });
});

export {};
