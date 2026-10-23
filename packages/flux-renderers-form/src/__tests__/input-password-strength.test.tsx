import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env, formStateProbeRenderer } from './form-test-support.js';

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  cleanup();
});

function renderForm(schema: BaseSchema) {
  const SchemaRenderer = createSchemaRenderer([
    ...formRendererDefinitions,
    buttonRenderer,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/input-password-strength"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function queryStrength(): HTMLElement | null {
  return document.querySelector('[data-slot="input-password-strength"]');
}

function getStrength(): HTMLElement {
  const el = queryStrength();
  if (!el) {
    throw new Error('Expected strength meter to be rendered');
  }
  return el;
}

function queryLabel(): HTMLElement | null {
  return document.querySelector('[data-slot="input-password-strength-label"]');
}

function typeIntoPassword(value: string) {
  const input = document.querySelector('input[name="secret"]') as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
}

function activeLevels(): Array<string | null> {
  return [...getStrength().querySelectorAll('[data-slot="input-password-strength-segment"]')]
    .filter((s) => s.getAttribute('data-active') === 'true')
    .map((s) => s.getAttribute('data-level'));
}

function formWith(body: Array<Record<string, unknown>>, data?: Record<string, unknown>): BaseSchema {
  return {
    type: 'form',
    data,
    body,
  } as BaseSchema;
}

describe('input-password — showStrength (G1I)', () => {
  it('renders the meter with weak level after typing a weak password (discriminating: fails without implementation)', () => {
    renderForm(formWith([{ type: 'input-password', name: 'secret', label: 'Secret', showStrength: true }]));
    expect(queryStrength()).toBeNull();
    typeIntoPassword('abc');
    const meter = getStrength();
    expect(meter.getAttribute('role')).toBe('meter');
    expect(meter.getAttribute('aria-valuenow')).toBe('1');
    expect(meter.getAttribute('aria-valuemin')).toBe('0');
    expect(meter.getAttribute('aria-valuemax')).toBe('4');
    expect(meter.getAttribute('aria-label')).toBe('Password strength');
    const segments = meter.querySelectorAll('[data-slot="input-password-strength-segment"]');
    expect(segments.length).toBe(4);
    const active = [...segments].filter((s) => s.getAttribute('data-active') === 'true');
    expect(active.length).toBe(1);
    expect(activeLevels()).toEqual(['weak']);
    const label = queryLabel();
    expect(label?.textContent).toBe('Weak');
    expect(label?.getAttribute('aria-live')).toBe('polite');
  });

  it('advances through fair → good → strong with the documented scoring rules', () => {
    renderForm(formWith([{ type: 'input-password', name: 'secret', label: 'Secret', showStrength: true }]));
    const meter = () => getStrength();
    typeIntoPassword('abcd1234');
    expect(meter().getAttribute('aria-valuenow')).toBe('2');
    expect(activeLevels()).toEqual(['weak', 'fair']);
    expect(queryLabel()?.textContent).toBe('Fair');

    typeIntoPassword('Abcd1234');
    expect(meter().getAttribute('aria-valuenow')).toBe('3');
    expect(queryLabel()?.textContent).toBe('Good');

    typeIntoPassword('abcd123456');
    expect(meter().getAttribute('aria-valuenow')).toBe('3');

    typeIntoPassword('Abcd1234abcd');
    expect(meter().getAttribute('aria-valuenow')).toBe('4');
    expect(queryLabel()?.textContent).toBe('Strong');

    typeIntoPassword('Abcd1234!@#$');
    expect(meter().getAttribute('aria-valuenow')).toBe('4');
    const active = [...meter().querySelectorAll('[data-slot="input-password-strength-segment"]')].filter(
      (s) => s.getAttribute('data-active') === 'true',
    );
    expect(active.length).toBe(4);
  });

  it('removes the strength row when the value is cleared back to empty', () => {
    renderForm(
      formWith([{ type: 'input-password', name: 'secret', label: 'Secret', showStrength: true }], {
        secret: 'abcd1234',
      }),
    );
    expect(queryStrength()).not.toBeNull();
    typeIntoPassword('');
    expect(queryStrength()).toBeNull();
  });

  it('does not render the meter when showStrength is not declared (regression guard)', () => {
    renderForm(formWith([{ type: 'input-password', name: 'secret', label: 'Secret' }]));
    typeIntoPassword('Abcd1234!@#$');
    expect(queryStrength()).toBeNull();
  });

  it('does not render the meter for input-text even when showStrength is declared (password-only consumption)', () => {
    renderForm(formWith([{ type: 'input-text', name: 'plain', label: 'Plain', showStrength: true }]));
    const input = document.querySelector('input[name="plain"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Abcd1234!@#$' } });
    expect(queryStrength()).toBeNull();
  });

  it('coexists with revealPassword toggle', () => {
    renderForm(
      formWith([
        { type: 'input-password', name: 'secret', label: 'Secret', showStrength: true, revealPassword: true },
      ]),
    );
    typeIntoPassword('abcd1234');
    expect(document.querySelector('[data-slot="input-password-reveal"]')).not.toBeNull();
    expect(queryStrength()).not.toBeNull();
    const reveal = document.querySelector('[data-slot="input-password-reveal"]') as HTMLButtonElement;
    fireEvent.click(reveal);
    const input = document.querySelector('input[name="secret"]') as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(queryStrength()).not.toBeNull();
  });

  it('links the input aria-describedby to the strength label id', () => {
    renderForm(
      formWith([{ type: 'input-password', name: 'secret', label: 'Secret', showStrength: true }], {
        secret: 'abcd1234',
      }),
    );
    const input = document.querySelector('input[name="secret"]') as HTMLInputElement;
    expect(input.getAttribute('aria-describedby')).toContain('secret-strength');
    const label = queryLabel();
    expect(label?.id).toBe('secret-strength');
  });

  it('renders statically when the field is disabled', () => {
    renderForm(
      formWith(
        [{ type: 'input-password', name: 'secret', label: 'Secret', showStrength: true, disabled: true }],
        { secret: 'Abcd1234!@#$' },
      ),
    );
    expect(getStrength().getAttribute('aria-valuenow')).toBe('4');
  });
});
