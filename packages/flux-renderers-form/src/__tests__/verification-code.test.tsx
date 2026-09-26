import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

const allDefinitions = [...formRendererDefinitions, formStateProbeRenderer];

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function renderForm(body: Array<Record<string, unknown>>) {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/verification-code"
      schema={{ type: 'form', body } as unknown as BaseSchema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function input0(): HTMLInputElement {
  // The real hidden input carries data-input-otp (the wrapper div uses the
  // data-slot name).
  return (document.querySelector('[data-input-otp]') ?? document.querySelector('[data-slot="input-otp"] input')) as HTMLInputElement;
}

function probeText(name: string): string {
  const probe = document.querySelector(`[data-testid="form-state:${name}"]`);
  expect(probe, `probe for '${name}' must render`).toBeTruthy();
  return probe!.textContent ?? '';
}

function typeCode(code: string) {
  // input-otp drives off the hidden input's onChange; fireEvent.change
  // performs the tracker reset + input event for React's synthetic onChange.
  fireEvent.change(input0(), { target: { value: code } });
}

describe('verification-code renderer (missing-components L2.4, plan 508)', () => {
  it('renders `length` cells (default 6, clamped for non-positive)', () => {
    renderForm([
      { type: 'verification-code', name: 'code', label: 'Code' },
      { type: 'verification-code', name: 'codeBad', label: 'Code', length: 0 },
    ]);
    expect(document.querySelectorAll('[data-testid="form-state:code"]')).toBeTruthy();
    const groups = document.querySelectorAll('[data-slot="input-otp-group"]');
    expect(groups.length).toBe(2);
    expect(groups[0]!.querySelectorAll('[data-slot="input-otp-slot"]').length).toBe(6);
    expect(groups[1]!.querySelectorAll('[data-slot="input-otp-slot"]').length).toBe(6);
  });

  it('commits only when the full length is entered; shortening falls back to undefined', () => {
    renderForm([
      { type: 'verification-code', name: 'code3', label: 'Code', length: 4 },
      { type: 'form-state-probe', name: 'code3' },
    ]);
    // Partial input (2 digits) → undefined.
    typeCode('12');
    expect(probeText('code3')).toBe('null');
    // Full length → commits the code.
    typeCode('1234');
    expect(probeText('code3')).toBe('"1234"');
    // Backspace shortening → falls back to undefined (值语义不变式).
    typeCode('12');
    expect(probeText('code3')).toBe('null');
  });

  it('masked mode hides slot characters', () => {
    renderForm([
      { type: 'verification-code', name: 'maskedCode', label: 'Code', masked: true },
    ]);
    const otp = document.querySelector('[data-slot="input-otp"]');
    expect(otp?.hasAttribute('data-masked')).toBe(true);
  });

  it('marks the control disabled without touching the bound value', () => {
    renderForm([
      { type: 'verification-code', name: 'codeDisabled', label: 'Code', disabled: true },
      { type: 'form-state-probe', name: 'codeDisabled' },
    ]);
    const input = document.querySelector('[data-input-otp]') as HTMLInputElement;
    expect(input?.disabled).toBe(true);
    expect(probeText('codeDisabled')).toBe('null');
  });
});
