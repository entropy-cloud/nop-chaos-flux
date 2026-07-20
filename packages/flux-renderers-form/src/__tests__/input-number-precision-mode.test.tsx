import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env, formTestHarness } from './form-test-support.js';

const { submitCalls } = formTestHarness;

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function renderNumberField(schema: BaseSchema) {
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://input-number-precision-mode"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function getNumberInput(): HTMLInputElement {
  return screen.getByRole('spinbutton');
}

describe('input-number precisionMode — I10', () => {
  it('defaults to Math.round when precisionMode is not set', async () => {
    renderNumberField({
      type: 'form',
      id: 'num-form',
      data: {},
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-number', name: 'val', label: 'Val', precision: 2 },
        { type: 'button', label: 'Submit', onClick: { action: 'component:submit', componentId: 'num-form' } },
      ],
    } as any);

    const input = getNumberInput();
    fireEvent.change(input, { target: { value: '3.14159' } });
    fireEvent.blur(input);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].val).toBeCloseTo(3.14, 2);
  });

  it('rounds with precisionMode: round', async () => {
    renderNumberField({
      type: 'form',
      id: 'num-form',
      data: {},
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-number', name: 'val', label: 'Val', precision: 1, precisionMode: 'round' },
        { type: 'button', label: 'Submit', onClick: { action: 'component:submit', componentId: 'num-form' } },
      ],
    } as any);

    const input = getNumberInput();
    fireEvent.change(input, { target: { value: '3.45' } });
    fireEvent.blur(input);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].val).toBeCloseTo(3.5, 1);
  });

  it('truncates with precisionMode: truncate (positive)', async () => {
    renderNumberField({
      type: 'form',
      id: 'num-form',
      data: {},
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-number', name: 'val', label: 'Val', precision: 1, precisionMode: 'truncate' },
        { type: 'button', label: 'Submit', onClick: { action: 'component:submit', componentId: 'num-form' } },
      ],
    } as any);

    const input = getNumberInput();
    fireEvent.change(input, { target: { value: '3.45' } });
    fireEvent.blur(input);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].val).toBe(3.4);
  });

  it('truncates with precisionMode: truncate (negative)', async () => {
    renderNumberField({
      type: 'form',
      id: 'num-form',
      data: {},
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-number', name: 'val', label: 'Val', precision: 1, precisionMode: 'truncate' },
        { type: 'button', label: 'Submit', onClick: { action: 'component:submit', componentId: 'num-form' } },
      ],
    } as any);

    const input = getNumberInput();
    fireEvent.change(input, { target: { value: '-3.45' } });
    fireEvent.blur(input);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].val).toBe(-3.4);
  });

  it('ceils with precisionMode: ceil', async () => {
    renderNumberField({
      type: 'form',
      id: 'num-form',
      data: {},
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-number', name: 'val', label: 'Val', precision: 1, precisionMode: 'ceil' },
        { type: 'button', label: 'Submit', onClick: { action: 'component:submit', componentId: 'num-form' } },
      ],
    } as any);

    const input = getNumberInput();
    fireEvent.change(input, { target: { value: '3.41' } });
    fireEvent.blur(input);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].val).toBe(3.5);
  });

  it('floors with precisionMode: floor', async () => {
    renderNumberField({
      type: 'form',
      id: 'num-form',
      data: {},
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-number', name: 'val', label: 'Val', precision: 1, precisionMode: 'floor' },
        { type: 'button', label: 'Submit', onClick: { action: 'component:submit', componentId: 'num-form' } },
      ],
    } as any);

    const input = getNumberInput();
    fireEvent.change(input, { target: { value: '3.49' } });
    fireEvent.blur(input);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].val).toBe(3.4);
  });

  it('applies precisionMode on stepper step', async () => {
    renderNumberField({
      type: 'form',
      id: 'num-form',
      data: { val: 3.05 },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-number', name: 'val', label: 'Val', step: 0.1, precision: 1, precisionMode: 'floor' },
        { type: 'button', label: 'Submit', onClick: { action: 'component:submit', componentId: 'num-form' } },
      ],
    } as any);

    const input = getNumberInput();
    expect(input.value).toBe('3.05');

    fireEvent.click(screen.getByLabelText('Increase'));

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].val).toBe(3.1);
  });
});
