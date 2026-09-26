import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { schedulingRendererDefinitions } from '../scheduling-renderer-definitions.js';
import { getSixWeekGrid, toISODateString } from './utils/calendar-date-utils.js';
import { CalendarGridView } from './components/calendar-grid-view.js';

afterEach(cleanup);

describe('getSixWeekGrid (L4.2)', () => {
  it('always returns 42 days starting on the configured week start', () => {
    for (const firstDayOfWeek of [0, 1] as const) {
      const days = getSixWeekGrid(new Date(Date.UTC(2026, 8, 15)), firstDayOfWeek); // Sep 2026
      expect(days.length).toBe(42);
      expect(days[0].getUTCDay()).toBe(firstDayOfWeek);
      // contains the whole month
      const isos = days.map(toISODateString);
      expect(isos).toContain('2026-09-01');
      expect(isos).toContain('2026-09-30');
    }
  });
});

describe('CalendarGridView (L4.2)', () => {
  it('renders 42 cells with outside-month markers and dispatches selection', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <CalendarGridView
        currentDate={new Date(Date.UTC(2026, 8, 15))}
        firstDayOfWeek={1}
        onDateSelect={onSelect}
      />,
    );
    const cells = container.querySelectorAll('[data-slot="calendar-grid-cell"]');
    expect(cells.length).toBe(42);
    expect(container.querySelectorAll('[data-outside-month]').length).toBeGreaterThan(0);

    const midMonth = container.querySelector('[data-date="2026-09-15"]') as HTMLElement;
    fireEvent.click(midMonth);
    expect(onSelect).toHaveBeenCalledWith({ date: '2026-09-15', inMonth: true });
    expect(midMonth.getAttribute('data-selected')).toBe('true');
  });
});

describe('calendar monthShape grid (L4.2)', () => {
  const SchemaRenderer = createSchemaRenderer(schedulingRendererDefinitions);
  const env: RendererEnv = {
    fetcher: async function <T>() { return { status: 0, data: null as T }; },
    notify: () => undefined,
  };
  const formulaCompiler = createFormulaCompiler();

  it('renders the grid with zero events/resources (empty-state gate bypass)', () => {
    const { container } = render(
      <SchemaRenderer
        schema={{ type: 'calendar', view: 'month', monthShape: 'grid' }}
        schemaUrl="test://calendar-grid"
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.querySelector('[data-slot="calendar-grid"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="calendar-grid-cell"]').length).toBe(42);
  });

  it('default schema keeps the resource month view (zero regression)', async () => {
    const { container } = render(
      <SchemaRenderer
        schema={{ type: 'calendar', view: 'month', events: [], resources: [] }}
        schemaUrl="test://calendar-resource-empty"
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(container.querySelector('[data-slot="calendar"]')).toBeTruthy());
    expect(container.textContent).not.toContain('Schema is preparing');
    expect(container.querySelector('[data-slot="calendar-grid"]')).toBeNull();
  });
});
