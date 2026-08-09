import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env, formTestHarness } from './form-test-support.js';
import { resolvePresetEntry, resolveRelativePreset, sanitizePresets } from '../renderers/date/date-presets.js';

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
      schemaUrl="test://date-range-presets"
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

describe('resolveRelativePreset — relative preset resolution (boundaries / cross month / cross year)', () => {
  const NOW = new Date(2026, 2, 5, 15, 30); // 2026-03-05

  it('last7days is the inclusive 7-day window ending today', () => {
    const resolved = resolveRelativePreset('last7days', NOW);
    expect(resolved).toBeTruthy();
    expect(resolved!.start).toEqual(new Date(2026, 1, 27, 0, 0, 0, 0));
    expect(resolved!.end).toEqual(new Date(2026, 2, 5, 23, 59, 59, 999));
  });

  it('last7days crosses the year boundary correctly', () => {
    const resolved = resolveRelativePreset('last7days', new Date(2026, 0, 3, 9));
    expect(resolved!.start).toEqual(new Date(2025, 11, 28, 0, 0, 0, 0));
    expect(resolved!.end).toEqual(new Date(2026, 0, 3, 23, 59, 59, 999));
  });

  it('last30days is the inclusive 30-day window', () => {
    const resolved = resolveRelativePreset('last30days', NOW);
    expect(resolved!.start).toEqual(new Date(2026, 1, 4, 0, 0, 0, 0));
  });

  it('today spans midnight to end-of-day; yesterday is the full previous day', () => {
    const today = resolveRelativePreset('today', NOW);
    expect(today!.start).toEqual(new Date(2026, 2, 5, 0, 0, 0, 0));
    expect(today!.end).toEqual(new Date(2026, 2, 5, 23, 59, 59, 999));
    const yesterday = resolveRelativePreset('yesterday', NOW);
    expect(yesterday!.start).toEqual(new Date(2026, 2, 4, 0, 0, 0, 0));
    expect(yesterday!.end).toEqual(new Date(2026, 2, 4, 23, 59, 59, 999));
  });

  it('thisMonth spans month start → now; lastMonth spans the full previous month', () => {
    const thisMonth = resolveRelativePreset('thisMonth', NOW);
    expect(thisMonth!.start).toEqual(new Date(2026, 2, 1, 0, 0, 0, 0));
    expect(thisMonth!.end).toEqual(new Date(2026, 2, 5, 23, 59, 59, 999));
    const lastMonth = resolveRelativePreset('lastMonth', NOW);
    expect(lastMonth!.start).toEqual(new Date(2026, 1, 1, 0, 0, 0, 0));
    expect(lastMonth!.end).toEqual(new Date(2026, 1, 28, 23, 59, 59, 999));
  });

  it('unknown keys resolve to undefined (no preset — degrade, never throw)', () => {
    expect(resolveRelativePreset('last-quarter', NOW)).toBeUndefined();
    expect(resolveRelativePreset('', NOW)).toBeUndefined();
  });
});

describe('resolvePresetEntry / sanitizePresets — preset → absolute value protocol', () => {
  const NOW = new Date(2026, 2, 5, 15, 30);

  it('formats relative presets into the valueFormat delimited protocol', () => {
    const resolved = resolvePresetEntry({ label: '近7天', value: { relative: 'last7days' } }, 'YYYY-MM-DD', {}, NOW);
    expect(resolved).toEqual({ start: '2026-02-27', end: '2026-03-05' });
  });

  it('keeps absolute preset entries untouched', () => {
    const resolved = resolvePresetEntry(
      { label: 'Q1', value: { start: '2026-01-01', end: '2026-03-31' } },
      'YYYY-MM-DD',
      {},
      NOW,
    );
    expect(resolved).toEqual({ start: '2026-01-01', end: '2026-03-31' });
  });

  it('carries time components for datetime valueFormat', () => {
    const resolved = resolvePresetEntry(
      { label: '今日', value: { relative: 'today' } },
      'YYYY-MM-DD HH:mm',
      {},
      NOW,
    );
    expect(resolved).toEqual({ start: '2026-03-05 00:00', end: '2026-03-05 23:59' });
  });

  it('sanitizePresets drops invalid entries (missing label / malformed value)', () => {
    const clean = sanitizePresets([
      { label: '近7天', value: { relative: 'last7days' } },
      { label: 'Q1', value: { start: '2026-01-01', end: '2026-03-31' } },
      { label: 'bad-relative' },
      { label: 'bad-abs', value: { start: '2026-01-01' } },
      { label: '', value: { relative: 'today' } },
      'garbage',
    ]);
    expect(clean).toEqual([
      { label: '近7天', value: { relative: 'last7days' } },
      { label: 'Q1', value: { start: '2026-01-01', end: '2026-03-31' } },
    ]);
    expect(sanitizePresets('garbage')).toEqual([]);
    expect(sanitizePresets(undefined)).toEqual([]);
  });
});

describe('date-range renderer — relative presets UI + writeback', () => {
  it('renders preset chips and writes the absolute range on selection', async () => {
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
          presets: [
            { label: '近7天', value: { relative: 'last7days' } },
            { label: 'Q1', value: { start: '2026-01-01', end: '2026-03-31' } },
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
    const presets = within(popover).getByTestId('range-presets');
    expect(within(presets).getByText('近7天')).toBeTruthy();
    expect(within(presets).getByText('Q1')).toBeTruthy();

    // Absolute preset passes through verbatim.
    fireEvent.click(within(presets).getByText('Q1'));
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].range).toBe('2026-01-01,2026-03-31');
  });

  it('applies an absolute preset within the current year window', async () => {
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
          presets: [{ label: 'Q1', value: { start: '2026-01-01', end: '2026-03-31' } }],
        },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'range-form' },
        },
      ],
    } as any);

    const popover = await openRange();
    fireEvent.click(within(popover).getByText('Q1'));
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].range).toBe('2026-01-01,2026-03-31');
  });

  it('invalid preset entries fall back to no preset chips (no crash)', async () => {
    renderSchema({
      type: 'form',
      data: {},
      body: [
        {
          type: 'date-range',
          name: 'range',
          label: 'Range',
          presets: [
            { label: 'broken' },
            { value: { start: '2026-01-01', end: '2026-03-31' } },
          ],
        },
      ],
    } as any);

    const popover = await openRange();
    expect(within(popover).queryByTestId('range-presets')).toBeNull();
    expect(screen.getByTestId('range-trigger')).toBeTruthy();
  });
});
