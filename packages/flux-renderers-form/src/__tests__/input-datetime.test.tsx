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
      schemaUrl="test://input-datetime"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

async function openPicker() {
  fireEvent.click(screen.getByTestId('date-trigger'));
  return await screen.findByTestId('date-popover');
}

function pickDay(popover: HTMLElement, day: number) {
  const dayButton = within(popover)
    .getAllByRole('button')
    .find((btn) => btn.textContent === String(day));
  if (!dayButton) throw new Error(`Day ${day} not found`);
  fireEvent.click(dayButton);
}

describe('input-datetime renderer', () => {
  it('emits the nop-input-datetime marker and renders the datetime value', () => {
    renderSchema({
      type: 'form',
      data: { at: '2024-06-09 14:30' },
      body: [{ type: 'input-datetime', name: 'at', label: 'At' }],
    });
    expect(document.querySelector('.nop-input-datetime')).toBeTruthy();
    expect(screen.getByTestId('date-display').textContent).toBe('2024-06-09 14:30');
  });

  it('updates the date part while preserving the existing time', async () => {
    renderSchema({
      type: 'form',
      id: 'dt-form',
      data: { at: '2024-06-09 14:30' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-datetime', name: 'at', label: 'At' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'dt-form' },
        },
      ],
    } as any);

    const popover = await openPicker();
    pickDay(popover, 15);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    // Date moved to the 15th, time preserved at 14:30.
    expect(submitCalls[0].at).toBe('2024-06-15 14:30');
  });

  it('updates the time part via the hour/minute inputs', async () => {
    renderSchema({
      type: 'form',
      id: 'dt-form',
      data: { at: '2024-06-09 14:30' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-datetime', name: 'at', label: 'At' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'dt-form' },
        },
      ],
    } as any);

    const popover = await openPicker();
    const hourInput = within(popover).getByLabelText('Hour') as HTMLInputElement;
    fireEvent.change(hourInput, { target: { value: '08' } });

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    // Date unchanged, hour updated 14 → 08.
    expect(submitCalls[0].at).toBe('2024-06-09 08:30');
  });
});
