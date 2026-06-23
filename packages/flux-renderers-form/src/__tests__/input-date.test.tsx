import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env, formTestHarness } from './form-test-support.js';

const { submitCalls } = formTestHarness;

const allDefinitions = [...formRendererDefinitions, buttonRenderer];

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function renderSchema(schema: BaseSchema) {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://input-date"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

async function openDatePicker() {
  const trigger = screen.getByTestId('date-trigger');
  fireEvent.click(trigger);
  return await screen.findByTestId('date-popover');
}

function pickDay(popover: HTMLElement, day: number) {
  // Day buttons expose the full date as aria-label; match by text content instead.
  const dayButton = within(popover)
    .getAllByRole('button')
    .find((btn) => btn.textContent === String(day));
  if (!dayButton) {
    throw new Error(`Day ${day} button not found in calendar`);
  }
  fireEvent.click(dayButton);
}

describe('input-date renderer', () => {
  it('emits the nop-input-date marker and is wrapped by the field frame', () => {
    renderSchema({
      type: 'form',
      data: { when: '2024-06-09' },
      body: [{ type: 'input-date', name: 'when', label: 'When' }],
    });
    expect(document.querySelector('.nop-input-date')).toBeTruthy();
    expect(document.querySelector('.nop-field')).toBeTruthy();
  });

  it('renders the initial value via displayFormat', () => {
    renderSchema({
      type: 'form',
      data: { when: '2024-06-09' },
      body: [
        {
          type: 'input-date',
          name: 'when',
          label: 'When',
          displayFormat: 'DD/MM/YYYY',
        },
      ],
    });
    expect(screen.getByTestId('date-display').textContent).toBe('09/06/2024');
  });

  it('writes the selected date back to scope in valueFormat via calendar selection', async () => {
    renderSchema({
      type: 'form',
      id: 'date-form',
      data: { when: '2024-06-01' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-date', name: 'when', label: 'When' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'date-form' },
        },
      ],
    } as any);

    const popover = await openDatePicker();
    pickDay(popover, 20);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].when).toBe('2024-06-20');
  });

  it('clears the value via the clearable button', async () => {
    renderSchema({
      type: 'form',
      id: 'date-form',
      data: { when: '2024-06-09' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-date', name: 'when', label: 'When', clearable: true },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'date-form' },
        },
      ],
    } as any);

    fireEvent.click(screen.getByTestId('date-clear-inline'));
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].when).toBeUndefined();
  });

  it('round-trips a utc:true value without timezone drift', () => {
    const view = renderSchema({
      type: 'form',
      data: { when: '2024-06-09' },
      body: [
        { type: 'input-date', name: 'when', label: 'When', utc: true },
      ],
    });
    // The display is derived from UTC components so it matches the stored value.
    expect(view.container.querySelector('.nop-input-date')).toBeTruthy();
    expect(screen.getByTestId('date-display').textContent).toBe('2024-06-09');
  });
});

describe('input-date min/max constraint', () => {
  it('disables days outside the minDate/maxDate window', async () => {
    renderSchema({
      type: 'form',
      data: { when: '2024-06-10' },
      body: [
        {
          type: 'input-date',
          name: 'when',
          label: 'When',
          minDate: '2024-06-10',
          maxDate: '2024-06-15',
        },
      ],
    });

    const popover = await openDatePicker();
    // Day 9 (before min) must be disabled; day 12 (inside) must be enabled.
    const day9 = within(popover)
      .getAllByRole('button')
      .find((btn) => btn.textContent === '9') as HTMLButtonElement;
    const day12 = within(popover)
      .getAllByRole('button')
      .find((btn) => btn.textContent === '12') as HTMLButtonElement;
    expect(day9.disabled).toBe(true);
    expect(day12.disabled).toBe(false);
  });
});
