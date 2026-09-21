import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env, formStateProbeRenderer } from './form-test-support.js';

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  resetFluxI18n();
  cleanup();
});

function renderSchema(schema: BaseSchema) {
  const SchemaRenderer = createSchemaRenderer([
    ...formRendererDefinitions,
    buttonRenderer,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://input-number-badinput-decoupling"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function formStateText(path: string): string {
  return screen.getByTestId(`form-state:${path}`).textContent ?? '';
}

// P2-15 (plan 485 Phase 2): while typing, the input shows the in-progress text
// verbatim (including badInput intermediates like '12e' or a lone '-') and the
// stored value only moves on a valid parse or an explicit clear.
describe('P2-15: input-number display/commit decoupling across badInput intermediates', () => {
  it('keeps the badInput intermediate visible without wiping the stored value', () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { count: 5 },
      body: [
        { type: 'input-number', id: 'num', name: 'count', label: 'Count' },
        { type: 'form-state-probe', name: 'count' },
      ],
    } as any);

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('5');
    expect(formStateText('count')).toBe('5');

    fireEvent.change(input, { target: { value: '12e' } });

    expect(input.value).toBe('12e');
    expect(formStateText('count')).toBe('5');
  });

  it('commits undefined only on an explicit clear, not on a badInput empty report', () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { count: 5 },
      body: [
        { type: 'input-number', id: 'num', name: 'count', label: 'Count' },
        { type: 'form-state-probe', name: 'count' },
      ],
    } as any);

    const input = screen.getByRole('spinbutton') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '' } });

    expect(input.value).toBe('');
    // the state probe stringifies an undefined commit as 'null'
    expect(formStateText('count')).toBe('null');
  });

  it('commits the parsed value on a valid intermediate and resyncs the draft', () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { count: 5 },
      body: [
        { type: 'input-number', id: 'num', name: 'count', label: 'Count' },
        { type: 'form-state-probe', name: 'count' },
      ],
    } as any);

    const input = screen.getByRole('spinbutton') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '42' } });

    expect(formStateText('count')).toBe('42');
    expect(input.value).toBe('42');
  });
});
