import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
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

function renderInputNumber(field: Record<string, unknown>) {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://input-number-suffix-stepper-overlap"
      schema={{
        type: 'form',
        body: [{ type: 'input-number', name: 'weight', label: 'Weight', ...field }],
      } as BaseSchema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

/**
 * V12f Phase 3 — [G2-视角4-01] with a suffix configured while the stepper rail
 * is shown (default), the suffix span was pinned at `right-3` underneath the
 * stepper buttons (`right-1` + `w-6` = 1.75rem of rail). The suffix must clear
 * the rail; the input's right padding must cover the outermost overlay.
 * jsdom has no layout, so the contract is pinned at the class-token level:
 * right-8 = 2rem > 1.75rem rail edge, right-3 = 0.75rem < 1.75rem.
 */
describe('[G2-视角4-01] input-number suffix vs stepper overlap', () => {
  it('moves the suffix clear of the stepper rail when both are shown', () => {
    renderInputNumber({ suffix: 'kg' });

    const suffix = document.querySelector('[data-slot="suffix"]') as HTMLElement | null;
    expect(suffix, 'suffix must render').toBeTruthy();
    expect(suffix!.className).toContain('right-8');
    expect(suffix!.className).not.toContain('right-3');

    const stepper = document.querySelector('[data-slot="stepper"]') as HTMLElement | null;
    expect(stepper, 'stepper rail renders by default').toBeTruthy();

    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input.style.paddingRight).toBe('4rem');
  });

  it('keeps the suffix at the near edge when the stepper is hidden', () => {
    renderInputNumber({ suffix: 'kg', showStepper: false });

    const suffix = document.querySelector('[data-slot="suffix"]') as HTMLElement | null;
    expect(suffix).toBeTruthy();
    expect(suffix!.className).toContain('right-3');
    expect(suffix!.className).not.toContain('right-8');

    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input.style.paddingRight).toBe('2rem');
  });

  it('reserves the full rail width even without a suffix', () => {
    renderInputNumber({});

    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input.style.paddingRight).toBe('4rem');
  });
});
