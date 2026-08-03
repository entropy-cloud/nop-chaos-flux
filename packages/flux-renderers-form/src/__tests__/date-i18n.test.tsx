import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { env } from './form-test-support.js';

const allDefinitions = [...formRendererDefinitions];

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
      schemaUrl="test://date-i18n"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

describe('date family — localized labels (P2 i18n)', () => {
  it('input-date popover clear button is localized (zh-CN: 清除)', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });
    renderSchema({
      type: 'form',
      data: { when: '2024-06-09' },
      body: [{ type: 'input-date', name: 'when', label: 'When', clearable: true }],
    });
    fireEvent.click(screen.getByTestId('date-trigger'));
    const popover = await screen.findByTestId('date-popover');
    expect(within(popover).getByLabelText('清除')).toBeTruthy();
    // The inline clear button is localized too.
    expect(screen.getByTestId('date-clear-inline').getAttribute('aria-label')).toBe('清除');
  });

  it('input-datetime popover time sub-fields are localized (zh-CN: 时/分)', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });
    renderSchema({
      type: 'form',
      data: { at: '2024-06-09 14:30' },
      body: [{ type: 'input-datetime', name: 'at', label: 'At' }],
    });
    fireEvent.click(screen.getByTestId('date-trigger'));
    const popover = await screen.findByTestId('date-popover');
    expect(within(popover).getByLabelText('时')).toBeTruthy();
    expect(within(popover).getByLabelText('分')).toBeTruthy();
  });

  it('date-range empty trigger shows the localized placeholder (zh-CN: 选择范围)', () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });
    renderSchema({
      type: 'form',
      data: {},
      body: [{ type: 'date-range', name: 'range', label: 'Range' }],
    });
    expect(screen.queryByTestId('range-display')).toBeNull();
    expect(screen.getByText('选择范围')).toBeTruthy();
  });

  it('date-range popover time labels are localized (zh-CN: 开始时间/结束时间)', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });
    renderSchema({
      type: 'form',
      data: { range: '2024-06-09 09:00,2024-06-09 17:00' },
      body: [{ type: 'date-range', name: 'range', label: 'Range', rangeKind: 'datetime' }],
    });
    fireEvent.click(screen.getByTestId('range-trigger'));
    const popover = await screen.findByTestId('range-popover');
    expect(within(popover).getByText('开始时间')).toBeTruthy();
    expect(within(popover).getByText('结束时间')).toBeTruthy();
    expect(within(popover).getByLabelText('开始时间 时')).toBeTruthy();
  });

  it('input-time clear button is localized (zh-CN: 清除)', () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });
    renderSchema({
      type: 'form',
      data: { at: '08:30' },
      body: [{ type: 'input-time', name: 'at', label: 'At', clearable: true }],
    });
    expect(screen.getByTestId('time-clear').getAttribute('aria-label')).toBe('清除');
  });

  it('period range inputs use localized start/end aria-labels (zh-CN: 开始/结束)', () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });
    renderSchema({
      type: 'form',
      data: { m: '2024-01,2024-06' },
      body: [{ type: 'input-month', name: 'm', label: 'Month', selectionMode: 'range' }],
    });
    const inputs = document.querySelectorAll<HTMLInputElement>('[data-testid="period-input-month"]');
    expect(inputs.length).toBe(2);
    expect(inputs[0]!.getAttribute('aria-label')).toBe('Month 开始');
    expect(inputs[1]!.getAttribute('aria-label')).toBe('Month 结束');
  });

  it('en-US labels remain the canonical English strings', async () => {
    renderSchema({
      type: 'form',
      data: { when: '2024-06-09', at: '2024-06-09 14:30', range: '' },
      body: [
        { type: 'input-date', name: 'when', label: 'When', clearable: true },
        { type: 'input-datetime', name: 'at', label: 'At', clearable: true },
        { type: 'date-range', name: 'range', label: 'Range' },
      ],
    });
    const inputDatetimeRoot = document.querySelector('.nop-input-datetime') as HTMLElement;
    fireEvent.click(within(inputDatetimeRoot).getByTestId('date-trigger'));
    const popover = await screen.findByTestId('date-popover');
    expect(within(popover).getByLabelText('Hour')).toBeTruthy();
    expect(within(popover).getByLabelText('Minute')).toBeTruthy();
    expect(within(popover).getByLabelText('Clear')).toBeTruthy();
    cleanup();

    renderSchema({
      type: 'form',
      data: {},
      body: [{ type: 'date-range', name: 'range', label: 'Range' }],
    });
    expect(screen.getByText('Select range')).toBeTruthy();
  });
});

describe('date family — four-state coverage (P2-6)', () => {
  it('input-date disabled blocks the trigger', () => {
    renderSchema({
      type: 'form',
      data: { when: '2024-06-09' },
      body: [{ type: 'input-date', name: 'when', label: 'When', disabled: true }],
    });
    const trigger = screen.getByTestId('date-trigger') as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
  });

  it('input-date readOnly blocks the trigger (no interactive picker)', () => {
    renderSchema({
      type: 'form',
      data: { when: '2024-06-09' },
      body: [{ type: 'input-date', name: 'when', label: 'When', readOnly: true }],
    });
    const trigger = screen.getByTestId('date-trigger') as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
  });

  it('date-range disabled blocks the trigger', () => {
    renderSchema({
      type: 'form',
      data: { range: '2024-06-01,2024-06-10' },
      body: [{ type: 'date-range', name: 'range', label: 'Range', disabled: true }],
    });
    expect((screen.getByTestId('range-trigger') as HTMLButtonElement).disabled).toBe(true);
  });

  it('period month disabled blocks the native input', () => {
    renderSchema({
      type: 'form',
      data: { m: '2024-06' },
      body: [{ type: 'input-month', name: 'm', label: 'Month', disabled: true }],
    });
    expect((screen.getByTestId('period-input-month') as HTMLInputElement).disabled).toBe(true);
  });
});
