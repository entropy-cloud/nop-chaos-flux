// @vitest-environment happy-dom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env } from './form-test-support.js';
import '../test-dom-polyfills';

const INITIAL_DELAY = 400;
const REPEAT_INTERVAL = 80;

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  vi.useRealTimers();
  resetFluxI18n();
});

function renderNumberField(schema: BaseSchema) {
  cleanup();
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://input-number-long-press"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function getNumberInput(): HTMLInputElement {
  return screen.getByRole('spinbutton') as HTMLInputElement;
}

describe('input-number long-press continuous stepping', () => {
  it('fires continuous stepping after the initial delay on pointer-down', async () => {
    vi.useFakeTimers();
    renderNumberField({
      type: 'form',
      data: { count: 0 },
      body: [{ type: 'input-number', name: 'count', label: 'Count', step: 1 }],
    });

    const increase = screen.getByLabelText('Increase');

    fireEvent.pointerDown(increase, { button: 0 });
    expect(getNumberInput().value).toBe('0');

    await vi.advanceTimersByTimeAsync(INITIAL_DELAY);
    expect(getNumberInput().value).toBe('1');

    await vi.advanceTimersByTimeAsync(REPEAT_INTERVAL);
    expect(getNumberInput().value).toBe('2');

    await vi.advanceTimersByTimeAsync(REPEAT_INTERVAL);
    expect(getNumberInput().value).toBe('3');

    fireEvent.pointerUp(increase);
    fireEvent.click(increase);
    expect(getNumberInput().value).toBe('3');
  });

  it('stops continuous stepping when clamped to max (longpress-clamp)', async () => {
    vi.useFakeTimers();
    renderNumberField({
      type: 'form',
      data: { count: 0 },
      body: [{ type: 'input-number', name: 'count', label: 'Count', step: 1, max: 3 }],
    });

    const increase = screen.getByLabelText('Increase');
    fireEvent.pointerDown(increase, { button: 0 });

    await vi.advanceTimersByTimeAsync(INITIAL_DELAY);
    await vi.advanceTimersByTimeAsync(REPEAT_INTERVAL);
    await vi.advanceTimersByTimeAsync(REPEAT_INTERVAL);
    expect(getNumberInput().value).toBe('3');

    await vi.advanceTimersByTimeAsync(REPEAT_INTERVAL * 5);
    expect(getNumberInput().value).toBe('3');

    fireEvent.pointerUp(increase);
  });

  it('pointer-up cancels continuous stepping and suppresses trailing click (longpress-cancel)', async () => {
    vi.useFakeTimers();
    renderNumberField({
      type: 'form',
      data: { count: 0 },
      body: [{ type: 'input-number', name: 'count', label: 'Count', step: 1 }],
    });

    const increase = screen.getByLabelText('Increase');
    fireEvent.pointerDown(increase, { button: 0 });

    await vi.advanceTimersByTimeAsync(INITIAL_DELAY);
    await vi.advanceTimersByTimeAsync(REPEAT_INTERVAL);
    expect(getNumberInput().value).toBe('2');

    fireEvent.pointerUp(increase);
    fireEvent.click(increase);

    await vi.advanceTimersByTimeAsync(REPEAT_INTERVAL * 5);
    expect(getNumberInput().value).toBe('2');
  });

  it('pointer-leave cancels continuous stepping', async () => {
    vi.useFakeTimers();
    renderNumberField({
      type: 'form',
      data: { count: 0 },
      body: [{ type: 'input-number', name: 'count', label: 'Count', step: 1 }],
    });

    const decrease = screen.getByLabelText('Decrease');
    fireEvent.pointerDown(decrease, { button: 0 });

    await vi.advanceTimersByTimeAsync(INITIAL_DELAY);
    await vi.advanceTimersByTimeAsync(REPEAT_INTERVAL);
    expect(getNumberInput().value).toBe('-2');

    fireEvent.pointerLeave(decrease);
    fireEvent.click(decrease);

    await vi.advanceTimersByTimeAsync(REPEAT_INTERVAL * 5);
    expect(getNumberInput().value).toBe('-2');
  });

  it('short press (release before initial delay) still single-steps via click', () => {
    vi.useFakeTimers();
    renderNumberField({
      type: 'form',
      data: { count: 0 },
      body: [{ type: 'input-number', name: 'count', label: 'Count', step: 1 }],
    });

    const increase = screen.getByLabelText('Increase');
    fireEvent.pointerDown(increase, { button: 0 });
    fireEvent.pointerUp(increase);
    fireEvent.click(increase);

    expect(getNumberInput().value).toBe('1');
  });

  it('hides stepper buttons when showStepper is false (no regression)', () => {
    renderNumberField({
      type: 'form',
      data: { count: 5 },
      body: [{ type: 'input-number', name: 'count', label: 'Count', showStepper: false }],
    });

    expect(screen.queryByLabelText('Increase')).toBeNull();
    expect(screen.queryByLabelText('Decrease')).toBeNull();
  });
});
