import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env } from './form-test-support.js';

const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);
const formulaCompiler = createFormulaCompiler();

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function renderForm(body: Record<string, unknown>[]) {
  render(
    <SchemaRenderer
      schemaUrl="test://form/focus-first-error"
      schema={{
        type: 'form',
        id: 'focus-error-form',
        showErrorOn: ['submit'],
        submitAction: { action: 'ajax', args: { url: '/api/focus-error', method: 'post' } },
        body,
        actions: [
          {
            type: 'button',
            label: 'Submit focus test',
            onClick: { action: 'component:submit', componentId: 'focus-error-form' },
          },
        ],
      } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

/**
 * V12f Phase 3 — [G2-R5-视角4-01] the focus-first-error aid queried
 * `[aria-invalid="true"]` and called .focus() on the first match. For
 * container-type hosts (field-control wrapper, radio-group, button-group-select)
 * that match is a non-focusable div, so the aid silently no-oped and the
 * first error could never become the focus target.
 */
describe('[G2-R5-视角4-01] focus-first-error reaches a real focus target', () => {
  it('focuses the invalid input itself although the wrapper div carries aria-invalid first', async () => {
    renderForm([{ type: 'input-text', name: 'requiredField', label: 'Required', required: true }]);

    fireEvent.click(screen.getByText('Submit focus test'));

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText('Required'));
    });
  });

  it('focuses a control inside the radio-group when the group field is invalid', async () => {
    renderForm([
      {
        type: 'radio-group',
        name: 'level',
        label: 'Level',
        required: true,
        options: [
          { label: 'Low', value: 'low' },
          { label: 'High', value: 'high' },
        ],
      },
    ]);

    fireEvent.click(screen.getByText('Submit focus test'));

    await waitFor(() => {
      const active = document.activeElement as HTMLElement | null;
      expect(active?.closest('[data-slot="radio-group-options"]')).toBeTruthy();
    });
  });
});

/**
 * V12f Phase 3 — [G2-R5-视角4-02] combination surface: a required field inside
 * a collapsed fieldset keeps validating and blocks the submit; the reveal
 * (auto-expand) and the focus-first-error aid must work together so the
 * failure is neither silent nor unfocused.
 */
describe('[G2-R5-视角4-02] collapsed fieldset submit failure surfaces', () => {
  it('auto-expands the collapsed fieldset and focuses the invalid inner field', async () => {
    renderForm([
      {
        type: 'fieldset',
        title: 'Advanced',
        collapsible: true,
        collapsed: true,
        body: [{ type: 'input-text', name: 'nickname', label: 'Nickname', required: true }],
      },
    ]);

    const fieldset = document.querySelector('.nop-fieldset') as HTMLElement;
    expect(fieldset.getAttribute('data-collapsed')).toBe('true');

    fireEvent.click(screen.getByText('Submit focus test'));

    await waitFor(() => {
      expect(fieldset.getAttribute('data-collapsed')).toBeNull();
    });
    const body = fieldset.querySelector('[data-slot="fieldset-body"]') as HTMLElement;
    expect(body.style.display).not.toBe('none');
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText('Nickname'));
    });
  });
});
