import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env, formStateProbeRenderer } from './form-test-support.js';

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  resetFluxI18n();
  cleanup();
});

function renderSchema(schema: BaseSchema) {
  const SchemaRenderer = createSchemaRenderer([
    ...formRendererDefinitions,
    buttonRenderer,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://programmatic-setvalue-reaction"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

describe('S8: a programmatic value write (data-source default path) emits a canonical change that dependent expressions react to', () => {
  it('setValues driving role=admin re-evaluates a dependent disabled expression', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { role: 'viewer', adminCode: '' },
      body: [
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          options: [
            { label: 'Viewer', value: 'viewer' },
            { label: 'Admin', value: 'admin' },
          ],
        },
        {
          type: 'input-text',
          name: 'adminCode',
          label: 'Admin Code',
          disabled: '${role !== "admin"}',
        },
        {
          type: 'button',
          label: 'Make Admin',
          onClick: {
            action: 'setValues',
            formId: 'f',
            args: { values: { role: 'admin' } },
          },
        },
        { type: 'form-state-probe', name: 'role' },
      ],
    } as any);

    const adminCodeInput = screen.getByLabelText('Admin Code') as HTMLInputElement;
    expect(adminCodeInput.disabled).toBe(true);

    fireEvent.click(screen.getByText('Make Admin'));

    await waitFor(() => {
      expect(screen.getByTestId('form-state:role').textContent).toBe('"admin"');
    });
    await waitFor(() => {
      expect(adminCodeInput.disabled).toBe(false);
    });
  });

  it('component:setValue on a field re-evaluates a dependent visible expression', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { role: 'viewer', adminNote: '' },
      body: [
        {
          type: 'select',
          id: 'role-sel',
          name: 'role',
          label: 'Role',
          options: [
            { label: 'Viewer', value: 'viewer' },
            { label: 'Admin', value: 'admin' },
          ],
        },
        {
          type: 'input-text',
          name: 'adminNote',
          label: 'Admin Note',
          visible: '${role === "admin"}',
        },
        {
          type: 'button',
          label: 'Set Role',
          onClick: {
            action: 'component:setValue',
            componentId: 'f',
            args: { name: 'role', value: 'admin' },
          },
        },
      ],
    } as any);

    expect(screen.queryByLabelText('Admin Note')).toBeNull();

    fireEvent.click(screen.getByText('Set Role'));

    await waitFor(() => {
      expect(screen.getByLabelText('Admin Note')).toBeTruthy();
    });
  });
});
