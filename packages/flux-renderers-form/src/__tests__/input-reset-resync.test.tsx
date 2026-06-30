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
      schemaUrl="test://input-reset-resync"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function formStateText(path: string): string {
  return screen.getByTestId(`form-state:${path}`).textContent ?? '';
}

describe('I2: reset resynchronizes the displayed DOM value (controlled write is synchronous)', () => {
  it('input-text: component:reset restores both the DOM input.value and the runtime value', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { name: 'initial' },
      body: [
        { type: 'input-text', id: 'inp', name: 'name', label: 'Name' },
        {
          type: 'button',
          label: 'Reset',
          onClick: { action: 'component:reset', componentId: 'inp' },
        },
        { type: 'form-state-probe', name: 'name' },
      ],
    } as any);

    const input = screen.getByLabelText('Name') as HTMLInputElement;
    expect(input.value).toBe('initial');

    fireEvent.change(input, { target: { value: 'changed-by-user' } });
    await waitFor(() => expect(formStateText('name')).toBe('"changed-by-user"'));
    expect(input.value).toBe('changed-by-user');

    fireEvent.click(screen.getByText('Reset'));
    await waitFor(() => {
      expect(input.value).toBe('initial');
    });
    await waitFor(() => expect(formStateText('name')).toBe('"initial"'));
  });

  it('input-number: component:reset restores both the DOM input.value and the runtime value', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { count: 7 },
      body: [
        { type: 'input-number', id: 'num', name: 'count', label: 'Count' },
        {
          type: 'button',
          label: 'Reset',
          onClick: { action: 'component:reset', componentId: 'num' },
        },
        { type: 'form-state-probe', name: 'count' },
      ],
    } as any);

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('7');

    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.blur(input);
    await waitFor(() => expect(formStateText('count')).toBe('999'));
    expect(input.value).toBe('999');

    fireEvent.click(screen.getByText('Reset'));
    await waitFor(() => {
      expect(input.value).toBe('7');
    });
    await waitFor(() => expect(formStateText('count')).toBe('7'));
  });

  it('input-text: form-level component:reset drives the DOM input.value to follow the runtime (display resync)', async () => {
    renderSchema({
      type: 'form',
      id: 'the-form',
      data: { name: 'initial' },
      body: [
        { type: 'input-text', name: 'name', label: 'Name' },
        {
          type: 'button',
          label: 'Reset Form',
          onClick: { action: 'component:reset', componentId: 'the-form' },
        },
        { type: 'form-state-probe', name: 'name' },
      ],
    } as any);

    const input = screen.getByLabelText('Name') as HTMLInputElement;
    expect(input.value).toBe('initial');

    fireEvent.change(input, { target: { value: 'changed-by-user' } });
    await waitFor(() => expect(formStateText('name')).toBe('"changed-by-user"'));

    fireEvent.click(screen.getByText('Reset Form'));
    await waitFor(() => {
      expect(input.value).toBe('');
    });
    await waitFor(() => expect(formStateText('name')).toBe('null'));
  });
});
