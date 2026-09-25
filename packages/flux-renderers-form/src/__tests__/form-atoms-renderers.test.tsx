import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env, formStateProbeRenderer } from './form-test-support.js';

const allDefinitions = [...formRendererDefinitions, formStateProbeRenderer, buttonRenderer];

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
      schemaUrl="test://form-atoms-renderers"
      schema={{ type: 'form', body } as unknown as BaseSchema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function probeText(name: string): string {
  const probe = document.querySelector(`[data-testid="form-state:${name}"]`);
  expect(probe, `probe for '${name}' must render`).toBeTruthy();
  return probe!.textContent ?? '';
}

function thumb(): HTMLElement {
  const el = document.querySelector('[data-slot="slider-thumb"]');
  expect(el, 'slider thumb must render').toBeTruthy();
  return el as HTMLElement;
}

// jsdom has no layout: base-ui slider emits no aria-valuenow and its keyboard
// math is NaN — value writeback (drag/keyboard/step) is pinned at the e2e
// level (tests/e2e/form-atoms-slider.spec.ts, real Chromium). Here we pin the
// jsdom-observable surfaces: bound value render, disabled presentation, and
// the component:clear handle contract.
describe('slider renderer (missing-components L1)', () => {
  it('renders with a bound initial value and a visible value output', () => {
    renderForm([
      { type: 'slider', name: 'volume', label: 'Volume', value: 30 },
      { type: 'form-state-probe', name: 'volume' },
    ]);

    expect(probeText('volume')).toBe('30');
    expect(document.querySelector('[data-slot="slider-value"]')?.textContent).toBe('30');
    expect(thumb()).toBeTruthy();
    expect(document.querySelector('[data-slot="slider-track"]')).toBeTruthy();
  });

  it('marks the control disabled without touching the bound value', () => {
    renderForm([
      { type: 'slider', name: 'volume', label: 'Volume', value: 30, disabled: true },
      { type: 'form-state-probe', name: 'volume' },
    ]);

    const root = document.querySelector('[data-slot="slider"]');
    expect(root?.hasAttribute('data-disabled')).toBe(true);
    expect(probeText('volume')).toBe('30');
  });

  it('clears the value through the component:clear handle', async () => {
    renderForm([
      { type: 'slider', name: 'volume', label: 'Volume', value: 30, id: 'volume-field' },
      { type: 'form-state-probe', name: 'volume' },
      { type: 'button', label: 'clear-volume', onClick: { action: 'component:clear', componentId: 'volume-field' } },
    ]);

    fireEvent.click(screen.getByText('clear-volume'));
    await waitFor(() => expect(probeText('volume')).toBe('null'));
  });
});

describe('rating renderer (missing-components L1)', () => {
  it('renders count stars and commits a clicked value', () => {
    renderForm([
      { type: 'rating', name: 'score', label: 'Score', count: 5 },
      { type: 'form-state-probe', name: 'score' },
    ]);

    expect(document.querySelectorAll('[data-slot="rating-star"]').length).toBe(5);
    fireEvent.click(document.querySelectorAll('[data-slot="rating-star"]')[3]!);
    expect(probeText('score')).toBe('4');
  });

  it('respects the bound initial value', () => {
    renderForm([
      { type: 'rating', name: 'score', label: 'Score', value: 3 },
      { type: 'form-state-probe', name: 'score' },
    ]);

    expect(probeText('score')).toBe('3');
    const checked = Array.from(document.querySelectorAll('[data-slot="rating-star"]')).filter(
      (el) => el.getAttribute('aria-checked') === 'true',
    );
    expect(checked.length).toBe(3);
  });

  it('does not commit when readOnly', () => {
    renderForm([
      { type: 'rating', name: 'score', label: 'Score', value: 2, readOnly: true },
      { type: 'form-state-probe', name: 'score' },
    ]);

    fireEvent.click(document.querySelectorAll('[data-slot="rating-star"]')[4]!);
    expect(probeText('score')).toBe('2');
  });
});

describe('input-color renderer (missing-components L1)', () => {
  function openPickerAndClickPreset(color: string) {
    const trigger = document.querySelector('[data-slot="color-picker"] button') as HTMLElement;
    expect(trigger, 'color picker trigger must render').toBeTruthy();
    fireEvent.click(trigger);
    const preset = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="color-picker-preset"]'),
    ).find((el) => el.getAttribute('data-color') === color);
    expect(preset, `preset '${color}' must render`).toBeTruthy();
    fireEvent.click(preset!);
  }

  it('commits a preset swatch in hex format by default', () => {
    renderForm([
      { type: 'input-color', name: 'theme-color', label: 'Theme Color' },
      { type: 'form-state-probe', name: 'theme-color' },
    ]);

    openPickerAndClickPreset('#dc2626');
    expect(probeText('theme-color')).toBe('"#dc2626"');
  });

  it('normalizes commits to rgba when valueFormat=rgba', () => {
    renderForm([
      { type: 'input-color', name: 'theme-color', label: 'Theme Color', valueFormat: 'rgba' },
      { type: 'form-state-probe', name: 'theme-color' },
    ]);

    openPickerAndClickPreset('#dc2626');
    expect(probeText('theme-color')).toBe('"rgba(220, 38, 38, 1)"');
  });

  it('renders a bound value onto the swatch', () => {
    renderForm([
      { type: 'input-color', name: 'theme-color', label: 'Theme Color', value: '#0c2238' },
      { type: 'form-state-probe', name: 'theme-color' },
    ]);

    expect(probeText('theme-color')).toBe('"#0c2238"');
    const swatch = document.querySelector('[data-slot="color-picker-swatch"]') as HTMLElement;
    expect(swatch.style.backgroundColor).toMatch(/#0c2238|rgb\(12, 34, 56\)/);
  });
});
