import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env } from './form-test-support.js';

const allDefinitions = [...formRendererDefinitions, buttonRenderer];

function renderSchema(schema: BaseSchema) {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://input-date-relative-wiring"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

async function openDatePicker() {
  fireEvent.click(screen.getByTestId('date-trigger'));
  return await screen.findByTestId('date-popover');
}

async function openRangePicker() {
  fireEvent.click(screen.getByTestId('range-trigger'));
  return await screen.findByTestId('range-popover');
}

function dayButton(popover: HTMLElement, day: number) {
  // The grid renders adjacent-month trailing days; scope lookups to the
  // current month or "29" resolves to last month's trailing day.
  return within(popover)
    .getAllByRole('button')
    .filter((btn) => btn.closest('[data-outside]') === null)
    .find((btn) => btn.textContent === String(day)) as HTMLButtonElement;
}

/**
 * P1-05 focused suite: relative date expressions (now/today/now±Nd/today±Nd)
 * must actually reach the calendar constraints and the value display through
 * the renderer wiring — not just resolve in the single-function test.
 *
 * Calendar (popover) tests run on the real clock with time-robust assertions
 * (the Base UI popover open transition is not fake-timer compatible); display
 * tests pin a deterministic system time.
 */
describe('relative date expressions — renderer wiring (P1-05)', () => {
  beforeEach(() => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  afterEach(() => {
    cleanup();
    resetFluxI18n();
    vi.useRealTimers();
  });

  describe('calendar constraints (minDate/maxDate)', () => {
    it('input-date minDate:"now" disables past days in the calendar', async () => {
      renderSchema({
        type: 'form',
        data: { when: '2026-08-11' },
        body: [
          { type: 'input-date', name: 'when', label: 'When', minDate: 'now' },
        ],
      });

      const popover = await openDatePicker();
      const today = new Date().getDate();
      // Days strictly before "now" are disabled; today itself is not before now.
      if (today > 1) {
        expect(dayButton(popover, today - 1).disabled).toBe(true);
      }
      expect(dayButton(popover, today).disabled).toBe(false);
    });

    it('input-date maxDate:"now-1d" disables today (past max bound)', async () => {
      renderSchema({
        type: 'form',
        data: { when: '2026-08-11' },
        body: [
          { type: 'input-date', name: 'when', label: 'When', maxDate: 'now-1d' },
        ],
      });

      const popover = await openDatePicker();
      const today = new Date().getDate();
      // now-1d is strictly before today 00:00 → today is after maxDate.
      expect(dayButton(popover, today).disabled).toBe(true);
    });

    it('input-datetime minDate:"now" disables past days in the calendar', async () => {
      renderSchema({
        type: 'form',
        data: { when: '2026-08-11 10:00' },
        body: [
          { type: 'input-datetime', name: 'when', label: 'When', minDate: 'now' },
        ],
      });

      const popover = await openDatePicker();
      const today = new Date().getDate();
      if (today > 1) {
        expect(dayButton(popover, today - 1).disabled).toBe(true);
      }
      expect(dayButton(popover, today).disabled).toBe(false);
    });

    it('date-range minDate:"now" disables past days in the calendar', async () => {
      renderSchema({
        type: 'form',
        data: { range: '2026-08-11,2026-08-15' },
        body: [
          { type: 'date-range', name: 'range', label: 'Range', minDate: 'now' },
        ],
      });

      const popover = await openRangePicker();
      const today = new Date().getDate();
      if (today > 1) {
        expect(dayButton(popover, today - 1).disabled).toBe(true);
      }
      expect(dayButton(popover, today).disabled).toBe(false);
    });
  });

  describe('value display (deterministic system time 2026-08-11)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-11T00:00:00'));
    });

    it('input-date value:"today" initializes the display to today', () => {
      renderSchema({
        type: 'form',
        data: { when: 'today' },
        body: [{ type: 'input-date', name: 'when', label: 'When' }],
      });

      expect(screen.getByTestId('date-display').textContent).toBe('2026-08-11');
    });

    it('date-range value ends resolve relative expressions to today', () => {
      renderSchema({
        type: 'form',
        data: { range: 'today,today' },
        body: [{ type: 'date-range', name: 'range', label: 'Range' }],
      });

      expect(screen.getByTestId('range-display').textContent).toBe('2026-08-11 , 2026-08-11');
    });

    it('input-datetime value:"today" initializes the display to today', () => {
      renderSchema({
        type: 'form',
        data: { when: 'today' },
        body: [{ type: 'input-datetime', name: 'when', label: 'When' }],
      });

      expect(screen.getByTestId('date-display').textContent).toBe('2026-08-11 00:00');
    });
  });
});
