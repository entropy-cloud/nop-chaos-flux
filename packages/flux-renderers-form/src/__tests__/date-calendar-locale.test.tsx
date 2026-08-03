import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
      schemaUrl="test://date-locale"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function weekdayCells(popover: HTMLElement): string[] {
  return Array.from(popover.querySelectorAll('.rdp-weekday')).map(
    (cell) => cell.textContent ?? '',
  );
}

describe('date family — calendar locale follows the flux language (CX-7)', () => {
  it('input-date calendar weekdays are localized to zh-CN when the flux language is zh-CN', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });
    renderSchema({
      type: 'form',
      data: { when: '2024-06-09' },
      body: [{ type: 'input-date', name: 'when', label: 'When' }],
    });

    fireEvent.click(screen.getByTestId('date-trigger'));
    const popover = await screen.findByTestId('date-popover');
    const weekdays = weekdayCells(popover);
    // date-fns zh-CN is Monday-first (weekStartsOn 1).
    expect(weekdays[0]).toBe('一');
    expect(weekdays.join('')).toBe('一二三四五六日');
  });

  it('input-date calendar weekdays use en-US when the flux language is en-US', async () => {
    renderSchema({
      type: 'form',
      data: { when: '2024-06-09' },
      body: [{ type: 'input-date', name: 'when', label: 'When' }],
    });

    fireEvent.click(screen.getByTestId('date-trigger'));
    const popover = await screen.findByTestId('date-popover');
    const weekdays = weekdayCells(popover);
    expect(weekdays[0]).toBe('Su');
    expect(weekdays.join('')).toBe('SuMoTuWeThFrSa');
  });

  it('date-range calendar weekdays are localized to zh-CN', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });
    renderSchema({
      type: 'form',
      data: { range: '2024-06-01,2024-06-10' },
      body: [{ type: 'date-range', name: 'range', label: 'Range' }],
    });

    fireEvent.click(screen.getByTestId('range-trigger'));
    const popover = await screen.findByTestId('range-popover');
    const weekdays = weekdayCells(popover);
    expect(weekdays[0]).toBe('一');
  });

  it('input-month native control has no calendar grid to localize', () => {
    renderSchema({
      type: 'form',
      data: { m: '2024-06' },
      body: [{ type: 'input-month', name: 'm', label: 'Month' }],
    });
    const input = screen.getByTestId('period-input-month') as HTMLInputElement;
    expect(input.type).toBe('month');
    expect(document.querySelectorAll('.rdp-month').length).toBe(0);
  });
});
