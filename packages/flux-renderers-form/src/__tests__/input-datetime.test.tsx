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

describe('input-datetime — D12 time sub-field no digit doubling', () => {
  it('sequential digit typing 1 then 14 yields hour 14 (reads full value, no concat)', async () => {
    renderSchema({
      type: 'form',
      id: 'dt-form',
      data: { at: '2024-06-09 04:30' },
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
    // Simulate digit-by-digit typing: first '1' (hour → 1), then the DOM
    // accumulates to '14'. handleTimeChange reads the whole value + clamps, so
    // the result is 14 — NOT a doubled '11'.
    fireEvent.change(hourInput, { target: { value: '1' } });
    fireEvent.change(hourInput, { target: { value: '14' } });

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].at).toBe('2024-06-09 14:30');
  });
});

describe('input-datetime renderer — timeFormat granularity (P1-1)', () => {
  function buildTimeFormatForm(initialValue: string, extra: Record<string, unknown> = {}) {
    return {
      type: 'form',
      id: 'datetime-format-form',
      data: { at: initialValue },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        {
          type: 'input-datetime',
          name: 'at',
          label: 'At',
          valueFormat: 'YYYY-MM-DD HH:mm:ss',
          ...extra,
        },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'datetime-format-form' },
        },
      ],
    } as any;
  }

  it('renders a seconds sub-field when timeFormat includes ss', async () => {
    renderSchema(buildTimeFormatForm('2024-06-09 14:30:00', { timeFormat: 'HH:mm:ss' }));
    fireEvent.click(screen.getByTestId('date-trigger'));
    const popover = await screen.findByTestId('date-popover');
    expect(within(popover).getByLabelText('Second')).toBeTruthy();
  });

  it('does not render a seconds sub-field for the default HH:mm timeFormat', async () => {
    renderSchema(buildTimeFormatForm('2024-06-09 14:30:00'));
    fireEvent.click(screen.getByTestId('date-trigger'));
    const popover = await screen.findByTestId('date-popover');
    expect(within(popover).queryByLabelText('Second')).toBeNull();
  });

  it('commits a typed second via the seconds sub-field', async () => {
    renderSchema(buildTimeFormatForm('2024-06-09 14:30:00', { timeFormat: 'HH:mm:ss' }));
    fireEvent.click(screen.getByTestId('date-trigger'));
    const popover = await screen.findByTestId('date-popover');
    const second = within(popover).getByLabelText('Second') as HTMLInputElement;
    fireEvent.change(second, { target: { value: '45' } });

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].at).toBe('2024-06-09 14:30:45');
  });

  it('picking a date preserves seconds when timeFormat includes ss', async () => {
    renderSchema(buildTimeFormatForm('2024-06-09 14:30:20', { timeFormat: 'HH:mm:ss' }));
    const popover = await openPicker();
    pickDay(popover, 15);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].at).toBe('2024-06-15 14:30:20');
  });

  it('default timeFormat HH:mm zeroes seconds on a date pick', async () => {
    renderSchema(buildTimeFormatForm('2024-06-09 14:30:20'));
    const popover = await openPicker();
    pickDay(popover, 15);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].at).toBe('2024-06-15 14:30:00');
  });
});

describe('input-datetime — min/max across entry paths (D9)', () => {
  it('clamps a time-typed value that escapes below minDate back into [min,max]', async () => {
    renderSchema({
      type: 'form',
      id: 'dt-form',
      // minDate is later the same day than the typed hour would produce.
      data: { at: '2024-06-10 14:30' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-datetime', name: 'at', label: 'At', minDate: '2024-06-10 12:00' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'dt-form' },
        },
      ],
    } as any);

    const popover = await openPicker();
    const hourInput = within(popover).getByLabelText('Hour') as HTMLInputElement;
    // Typing 05 would yield 2024-06-10 05:30, which is < minDate 2024-06-10 12:00.
    fireEvent.change(hourInput, { target: { value: '05' } });

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    // Time-typing must NOT bypass minDate; committed value clamped into range.
    expect(submitCalls[0].at).toBe('2024-06-10 12:00');
  });

  it('clamps a time-typed value that escapes above maxDate back into [min,max]', async () => {
    renderSchema({
      type: 'form',
      id: 'dt-form',
      data: { at: '2024-06-10 14:30' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-datetime', name: 'at', label: 'At', maxDate: '2024-06-10 16:00' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'dt-form' },
        },
      ],
    } as any);

    const popover = await openPicker();
    const hourInput = within(popover).getByLabelText('Hour') as HTMLInputElement;
    // Typing 23 would yield 2024-06-10 23:30, which is > maxDate 2024-06-10 16:00.
    fireEvent.change(hourInput, { target: { value: '23' } });

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].at).toBe('2024-06-10 16:00');
  });

  it('does not clamp when the typed time stays within [min,max]', async () => {
    renderSchema({
      type: 'form',
      id: 'dt-form',
      data: { at: '2024-06-10 14:30' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        {
          type: 'input-datetime',
          name: 'at',
          label: 'At',
          minDate: '2024-06-10 08:00',
          maxDate: '2024-06-10 18:00',
        },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'dt-form' },
        },
      ],
    } as any);

    const popover = await openPicker();
    const hourInput = within(popover).getByLabelText('Hour') as HTMLInputElement;
    fireEvent.change(hourInput, { target: { value: '10' } });

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].at).toBe('2024-06-10 10:30');
  });
});
