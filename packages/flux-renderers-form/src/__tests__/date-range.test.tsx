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

describe('date-range renderer — D5 auto-swap confirmation (start<=end on write)', () => {
  it('swaps to start<=end when committing a reversed selection', async () => {
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
    // Pick 20 then 10 — reversed input; write-time normalizeRange must swap.
    pickDay(popover, 20);
    pickDay(popover, 10);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].range).toBe('2024-06-10,2024-06-20');
  });
});

describe('date-range renderer — D7 immediate-commit (no pending/preview leak)', () => {
  it('display equals the committed value immediately after a pick (no leak)', async () => {
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
    pickDay(popover, 18);

    // Immediate-commit contract: the visible display already reflects the picked
    // value (there is no pending/preview state that could leak). No confirm step.
    expect(screen.getByTestId('range-display').textContent).toBe('2024-06-10 , 2024-06-18');

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    // Displayed value == committed/submitted value (no divergence).
    expect(submitCalls[0].range).toBe('2024-06-10,2024-06-18');
  });
});

describe('date-range renderer — D4 bound independence (datetime-range)', () => {
  it('setting the end time preserves the start time component', async () => {
    renderSchema({
      type: 'form',
      id: 'range-form',
      data: { range: '2024-06-10 08:00,2024-06-10 18:00' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'date-range', name: 'range', label: 'Range', rangeKind: 'datetime' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'range-form' },
        },
      ],
    } as any);

    const popover = await openRange();
    // Change the END hour to 20; start must survive at 08:00.
    const endHour = within(popover).getByLabelText('End time hour') as HTMLInputElement;
    fireEvent.change(endHour, { target: { value: '20' } });

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    // Start time (08:00) survives untouched; only end changed (18:00 → 20:00).
    expect(submitCalls[0].range).toBe('2024-06-10 08:00,2024-06-10 20:00');
  });

  it('setting the start time preserves the end time component', async () => {
    renderSchema({
      type: 'form',
      id: 'range-form',
      data: { range: '2024-06-10 08:00,2024-06-10 18:00' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'date-range', name: 'range', label: 'Range', rangeKind: 'datetime' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'range-form' },
        },
      ],
    } as any);

    const popover = await openRange();
    const startMinute = within(popover).getByLabelText('Start time minute') as HTMLInputElement;
    fireEvent.change(startMinute, { target: { value: '45' } });

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    // End time (18:00) survives; only start minute changed (00 → 45).
    expect(submitCalls[0].range).toBe('2024-06-10 08:45,2024-06-10 18:00');
  });

  it('clamps a typed end time into the maxDate bound (H9)', async () => {
    renderSchema({
      type: 'form',
      id: 'range-form',
      data: { range: '2024-06-10 08:00,2024-06-10 18:00' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        // maxDate caps the day at 20:00 — a typed hour beyond that must clamp,
        // mirroring the single-field date control (no out-of-bounds commit).
        { type: 'date-range', name: 'range', label: 'Range', rangeKind: 'datetime', maxDate: '2024-06-10 20:00' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'range-form' },
        },
      ],
    } as any);

    const popover = await openRange();
    const endHour = within(popover).getByLabelText('End time hour') as HTMLInputElement;
    // Type 25 — the hour field clamps to 23, then commitRange clamps the
    // resulting datetime into maxDate (20:00). Without the bounds fix the
    // committed end would be 23:00 (out of bounds).
    fireEvent.change(endHour, { target: { value: '25' } });

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].range).toBe('2024-06-10 08:00,2024-06-10 20:00');
  });
});

describe('date-range renderer — required both-bounds validation (D6)', () => {
  it('fails required when only one bound is set (partial range)', async () => {
    renderSchema({
      type: 'form',
      id: 'range-form',
      // Partial range: start set, end empty → delimited value '2024-06-01,'.
      data: { range: '2024-06-01,' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'date-range', name: 'range', label: 'Range', required: true },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'range-form' },
        },
      ],
    } as any);

    fireEvent.click(screen.getByText('Submit'));
    // Required must fail on a partial range → submit is blocked.
    await waitFor(() => expect(submitCalls.length).toBe(0));
    // G14: partial range uses the dedicated range-aware message, not the generic
    // "is required" prompt.
    expect(await screen.findByText(/requires both ends of the range/i)).toBeTruthy();
  });

  it('passes required when both bounds are set', async () => {
    renderSchema({
      type: 'form',
      id: 'range-form',
      data: { range: '2024-06-01,2024-06-20' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'date-range', name: 'range', label: 'Range', required: true },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'range-form' },
        },
      ],
    } as any);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].range).toBe('2024-06-01,2024-06-20');
  });

  it('fails required when fully empty', async () => {
    renderSchema({
      type: 'form',
      id: 'range-form',
      data: {},
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'date-range', name: 'range', label: 'Range', required: true },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'range-form' },
        },
      ],
    } as any);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(0));
    expect(await screen.findByText(/is required/i)).toBeTruthy();
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
