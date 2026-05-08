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
  formTestHarness.reset();
  resetFluxI18n();
});

function renderNumberField(schema: BaseSchema) {
  cleanup();
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://input-number"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function getNumberInput(): HTMLInputElement {
  return screen.getByRole('spinbutton');
}

describe('input-number renderer', () => {
  it('renders a type=number input with initial value', () => {
    renderNumberField({
      type: 'form',
      data: { count: 5 },
      body: [{ type: 'input-number', name: 'count', label: 'Count' }],
    });

    const input = getNumberInput();
    expect(input).toBeTruthy();
    expect(input.type).toBe('number');
    expect(input.value).toBe('5');
  });

  it('displays empty input when value is undefined', () => {
    renderNumberField({
      type: 'form',
      data: {},
      body: [{ type: 'input-number', name: 'count', label: 'Count' }],
    });

    const input = getNumberInput();
    expect(input.value).toBe('');
  });

  it('displays empty input when value is null', () => {
    renderNumberField({
      type: 'form',
      data: { count: null },
      body: [{ type: 'input-number', name: 'count', label: 'Count' }],
    });

    const input = getNumberInput();
    expect(input.value).toBe('');
  });

  it('updates form value to number type on input change', async () => {
    renderNumberField({
      type: 'form',
      id: 'num-form',
      data: { count: 0 },
      submitAction: {
        action: 'ajax',
        args: { url: '/api/test', method: 'post' },
      },
      body: [
        { type: 'input-number', name: 'count', label: 'Count' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'num-form' },
        },
      ],
    } as any);

    const input = getNumberInput();
    fireEvent.change(input, { target: { value: '42' } });
    fireEvent.blur(input);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].count).toBe(42);
    expect(typeof submitCalls[0].count).toBe('number');
  });

  it('sets form value to undefined when input is cleared', async () => {
    renderNumberField({
      type: 'form',
      id: 'num-form',
      data: { count: 10 },
      submitAction: {
        action: 'ajax',
        args: { url: '/api/test', method: 'post' },
      },
      body: [
        { type: 'input-number', name: 'count', label: 'Count' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'num-form' },
        },
      ],
    } as any);

    const input = getNumberInput();
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].count).toBeUndefined();
  });

  it('clamps value to min on blur', async () => {
    renderNumberField({
      type: 'form',
      id: 'num-form',
      data: {},
      submitAction: {
        action: 'ajax',
        args: { url: '/api/test', method: 'post' },
      },
      body: [
        { type: 'input-number', name: 'count', label: 'Count', min: 0 },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'num-form' },
        },
      ],
    } as any);

    const input = getNumberInput();
    fireEvent.change(input, { target: { value: '-5' } });
    fireEvent.blur(input);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].count).toBe(0);
  });

  it('clamps value to max on blur', async () => {
    renderNumberField({
      type: 'form',
      id: 'num-form',
      data: {},
      submitAction: {
        action: 'ajax',
        args: { url: '/api/test', method: 'post' },
      },
      body: [
        { type: 'input-number', name: 'count', label: 'Count', max: 100 },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'num-form' },
        },
      ],
    } as any);

    const input = getNumberInput();
    fireEvent.change(input, { target: { value: '200' } });
    fireEvent.blur(input);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].count).toBe(100);
  });

  it('renders stepper buttons when showStepper is true (default)', () => {
    renderNumberField({
      type: 'form',
      data: { count: 5 },
      body: [{ type: 'input-number', name: 'count', label: 'Count' }],
    });

    expect(screen.getByLabelText('Decrease')).toBeTruthy();
    expect(screen.getByLabelText('Increase')).toBeTruthy();
  });

  it('hides stepper buttons when showStepper is false', () => {
    renderNumberField({
      type: 'form',
      data: { count: 5 },
      body: [{ type: 'input-number', name: 'count', label: 'Count', showStepper: false }],
    });

    expect(screen.queryByLabelText('Decrease')).toBeNull();
    expect(screen.queryByLabelText('Increase')).toBeNull();
  });

  it('increments value by step when increase button is clicked', async () => {
    renderNumberField({
      type: 'form',
      data: { count: 10 },
      body: [
        { type: 'input-number', name: 'count', label: 'Count', step: 5 },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'submit' },
        },
      ],
    });

    fireEvent.click(screen.getByLabelText('Increase'));

    const input = getNumberInput();
    expect(input.value).toBe('15');
  });

  it('decrements value by step when decrease button is clicked', async () => {
    renderNumberField({
      type: 'form',
      data: { count: 10 },
      body: [
        { type: 'input-number', name: 'count', label: 'Count', step: 5 },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'submit' },
        },
      ],
    });

    fireEvent.click(screen.getByLabelText('Decrease'));

    const input = getNumberInput();
    expect(input.value).toBe('5');
  });

  it('clamps to max when stepping exceeds max', () => {
    renderNumberField({
      type: 'form',
      data: { count: 8 },
      body: [
        { type: 'input-number', name: 'count', label: 'Count', max: 10, step: 5 },
      ],
    });

    fireEvent.click(screen.getByLabelText('Increase'));

    const input = getNumberInput();
    expect(input.value).toBe('10');
  });

  it('clamps to min when stepping below min', () => {
    renderNumberField({
      type: 'form',
      data: { count: 2 },
      body: [
        { type: 'input-number', name: 'count', label: 'Count', min: 0, step: 5 },
      ],
    });

    fireEvent.click(screen.getByLabelText('Decrease'));

    const input = getNumberInput();
    expect(input.value).toBe('0');
  });

  it('applies precision to value on blur', async () => {
    renderNumberField({
      type: 'form',
      id: 'num-form',
      data: {},
      submitAction: {
        action: 'ajax',
        args: { url: '/api/test', method: 'post' },
      },
      body: [
        { type: 'input-number', name: 'price', label: 'Price', precision: 2 },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'num-form' },
        },
      ],
    } as any);

    const input = getNumberInput();
    fireEvent.change(input, { target: { value: '3.14159' } });
    fireEvent.blur(input);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].price).toBeCloseTo(3.14, 2);
  });

  it('renders prefix text', () => {
    renderNumberField({
      type: 'form',
      data: { price: 100 },
      body: [{ type: 'input-number', name: 'price', label: 'Price', prefix: '$' }],
    });

    expect(screen.getByText('$')).toBeTruthy();
  });

  it('renders suffix text', () => {
    renderNumberField({
      type: 'form',
      data: { width: 100 },
      body: [{ type: 'input-number', name: 'width', label: 'Width', suffix: 'px' }],
    });

    expect(screen.getByText('px')).toBeTruthy();
  });

  it('disables input and stepper when disabled', () => {
    renderNumberField({
      type: 'form',
      data: { count: 5 },
      body: [{ type: 'input-number', name: 'count', label: 'Count', disabled: true }],
    });

    const input = getNumberInput();
    expect(input.disabled).toBe(true);
    expect((screen.getByLabelText('Decrease') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Increase') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows placeholder when value is empty', () => {
    renderNumberField({
      type: 'form',
      data: {},
      body: [{ type: 'input-number', name: 'count', label: 'Count', placeholder: 'Enter a number' }],
    });

    const input = getNumberInput();
    expect(input.placeholder).toBe('Enter a number');
  });

  it('shows validation error when required field is empty on submit', async () => {
    renderNumberField({
      type: 'form',
      data: {},
      submitAction: {
        action: 'ajax',
        args: { url: '/api/test', method: 'post' },
      },
      body: [
        { type: 'input-number', name: 'count', label: 'Count', required: true },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'submitForm' },
        },
      ],
    });

    fireEvent.click(screen.getByText('Submit'));

    expect(submitCalls.length).toBe(0);
    expect(await screen.findByText(/is required/i)).toBeTruthy();
  });

  it('renders with nop-input-number marker class', () => {
    renderNumberField({
      type: 'form',
      data: { count: 5 },
      body: [{ type: 'input-number', name: 'count', label: 'Count' }],
    });

    const marker = document.querySelector('.nop-input-number');
    expect(marker).toBeTruthy();
  });
});
