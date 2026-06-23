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
      schemaUrl="test://date-range"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

async function openRange() {
  fireEvent.click(screen.getByTestId('range-trigger'));
  return await screen.findByTestId('range-popover');
}

function pickDay(popover: HTMLElement, day: number) {
  const dayButton = within(popover)
    .getAllByRole('button')
    .find((btn) => btn.textContent === String(day));
  if (!dayButton) throw new Error(`Day ${day} not found`);
  fireEvent.click(dayButton);
}

describe('date-range renderer — contract convergence', () => {
  it('emits a single nop-date-range marker and resolves rangeKind=date by default', () => {
    renderSchema({
      type: 'form',
      data: { range: '2024-06-01,2024-06-20' },
      body: [{ type: 'date-range', name: 'range', label: 'Range' }],
    });
    expect(document.querySelector('.nop-date-range')).toBeTruthy();
    expect(document.querySelector('[data-range-kind]')?.getAttribute('data-range-kind')).toBe('date');
  });

  it('resolves rangeKind=datetime and time without splitting into separate canonical types', () => {
    renderSchema({
      type: 'form',
      data: {},
      body: [{ type: 'date-range', name: 'r1', rangeKind: 'datetime' }],
    });
    expect(document.querySelector('[data-range-kind="datetime"]')).toBeTruthy();

    cleanup();
    renderSchema({
      type: 'form',
      data: {},
      body: [{ type: 'date-range', name: 'r2', rangeKind: 'time' }],
    });
    expect(document.querySelector('[data-range-kind="time"]')).toBeTruthy();
  });

  it('has no parallel input-date-range / input-datetime-range / input-time-range types', () => {
    const dateTypes = allDefinitions
      .map((def) => def.type)
      .filter((type) => /range/i.test(String(type)));
    expect(dateTypes).toEqual(['date-range']);
  });
});

describe('date-range renderer — rangeKind=date selection + delimiter writeback', () => {
  it('selects a range via the calendar and joins ends with the delimiter', async () => {
    renderSchema({
      type: 'form',
      id: 'range-form',
      data: { range: '2024-06-10,2024-06-10' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'date-range', name: 'range', label: 'Range' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'range-form' },
        },
      ],
    } as any);

    const popover = await openRange();
    // Seed anchors the month to June 2024; clicking day 18 (after the range)
    // extends the end, exercising real calendar writeback + delimiter join.
    pickDay(popover, 18);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].range).toBe('2024-06-10,2024-06-18');
  });

  it('honors a custom delimiter', async () => {
    renderSchema({
      type: 'form',
      id: 'range-form',
      data: { range: '2024-06-10~2024-06-10' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'date-range', name: 'range', label: 'Range', delimiter: '~' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'range-form' },
        },
      ],
    } as any);

    const popover = await openRange();
    pickDay(popover, 18);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].range).toBe('2024-06-10~2024-06-18');
  });
});

describe('date-range renderer — start/end order normalization', () => {
  it('normalizes a reversed stored value on display', () => {
    renderSchema({
      type: 'form',
      data: { range: '2024-06-20,2024-06-01' },
      body: [{ type: 'date-range', name: 'range', label: 'Range' }],
    });
    // Reversed ends are presented well-ordered (start < end).
    expect(screen.getByTestId('range-display').textContent).toBe('2024-06-01 , 2024-06-20');
  });

  it('swaps ends when the user picks an end earlier than the start', async () => {
    renderSchema({
      type: 'form',
      id: 'range-form',
      data: { range: '2024-06-15,2024-06-20' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'date-range', name: 'range', label: 'Range' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'range-form' },
        },
      ],
    } as any);

    const popover = await openRange();
    // Pick 20 then 10 — ends come in reversed; commitRange must swap them.
    pickDay(popover, 20);
    pickDay(popover, 10);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].range).toBe('2024-06-10,2024-06-20');
  });
});

describe('date-range renderer — shortcuts + min/max', () => {
  it('applies a shortcut and normalizes its ends', async () => {
    renderSchema({
      type: 'form',
      id: 'range-form',
      data: {},
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        {
          type: 'date-range',
          name: 'range',
          label: 'Range',
          shortcuts: [
            { label: 'Last week', start: '2024-06-20', end: '2024-06-10' },
          ],
        },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'range-form' },
        },
      ],
    } as any);

    const popover = await openRange();
    fireEvent.click(within(popover).getByText('Last week'));

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].range).toBe('2024-06-10,2024-06-20');
  });

  it('disables days outside the minDate/maxDate window', async () => {
    renderSchema({
      type: 'form',
      data: { range: '2024-06-12,2024-06-13' },
      body: [
        {
          type: 'date-range',
          name: 'range',
          label: 'Range',
          minDate: '2024-06-10',
          maxDate: '2024-06-15',
        },
      ],
    });

    const popover = await openRange();
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

describe('date-range renderer — rangeKind=time writeback', () => {
  it('writes start/end time via the two native time inputs', async () => {
    renderSchema({
      type: 'form',
      id: 'range-form',
      data: { range: '08:00,17:00' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'date-range', name: 'range', label: 'Range', rangeKind: 'time' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'range-form' },
        },
      ],
    } as any);

    const popover = await openRange();
    const startInput = within(popover).getByLabelText('Range start time') as HTMLInputElement;
    const endInput = within(popover).getByLabelText('Range end time') as HTMLInputElement;

    fireEvent.change(startInput, { target: { value: '09:30' } });
    fireEvent.change(endInput, { target: { value: '18:00' } });

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].range).toBe('09:30,18:00');
  });
});
