import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env, formStateProbeRenderer } from './form-test-support.js';
import { computePasswordStrengthLevel } from '../renderers/input-password-strength.js';

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

function queryMeter(): HTMLElement | null {
  return document.querySelector('[data-slot="input-password-strength"]');
}

function getMeter(): HTMLElement {
  const meter = queryMeter();
  if (!meter) {
    throw new Error('Expected strength meter to be rendered');
  }
  return meter;
}

function getSegments(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll('[data-slot="input-password-strength-segment"]'),
  ) as HTMLElement[];
}

describe('computePasswordStrengthLevel — level algorithm (design.md §4)', () => {
  it.each([
    ['', 0],
    ['abcde', 0],
    ['Ab1!', 0],
    ['abcdef', 1],
    ['xxxxxxx', 1],
    ['Abcdef1', 2],
    ['abc123!', 2],
    ['Abcdefg1', 3],
    ['Abcdef1!', 4],
  ] as const)('%j → level %i', (value, expected) => {
    expect(computePasswordStrengthLevel(value)).toBe(expected);
  });

  it('returns 0 for empty string (total function; renderer hides the meter)', () => {
    expect(computePasswordStrengthLevel('')).toBe(0);
  });

  it('counts a non-ASCII letter as a symbol (non-alphanumeric criterion)', () => {
    expect(computePasswordStrengthLevel('Abcdef1ä')).toBe(4);
  });
});

describe('input-password — showStrength meter', () => {
  it('does not render meter when showStrength is not declared', () => {
    renderForm({
      type: 'form',
      data: { secret: 'Abcdef1!' },
      body: [{ type: 'input-password', name: 'secret', label: 'Secret' }],
    });

    expect(queryMeter()).toBeNull();
  });

  it('does not render meter when value is empty', () => {
    renderForm({
      type: 'form',
      data: { secret: '' },
      body: [{ type: 'input-password', name: 'secret', label: 'Secret', showStrength: true }],
    });

    expect(queryMeter()).toBeNull();
  });

  it('renders meter with level anatomy: 4 segments, fill = max(1, level), color band, aria trio', () => {
    renderForm({
      type: 'form',
      data: { secret: 'Abcdef1!' },
      body: [{ type: 'input-password', name: 'secret', label: 'Secret', showStrength: true }],
    });

    const meter = getMeter();
    expect(meter.getAttribute('role')).toBe('meter');
    expect(meter.getAttribute('aria-valuemin')).toBe('0');
    expect(meter.getAttribute('aria-valuemax')).toBe('4');
    expect(meter.getAttribute('aria-valuenow')).toBe('4');
    expect(meter.getAttribute('aria-valuetext')).toBe('Strong');
    expect(meter.getAttribute('aria-label')).toBe('Password strength');

    const segments = getSegments();
    expect(segments).toHaveLength(4);
    const fills = segments.map((s) => s.className);
    expect(fills.filter((c) => c.includes('bg-success'))).toHaveLength(4);

    const label = document.querySelector('[data-slot="input-password-strength-label"]');
    expect(label?.textContent).toBe('Strong');
  });

  it('level 0 (too short) fills 1 destructive segment with aria-valuenow=0 and "Too short"', () => {
    renderForm({
      type: 'form',
      data: { secret: 'ab1' },
      body: [{ type: 'input-password', name: 'secret', label: 'Secret', showStrength: true }],
    });

    const meter = getMeter();
    expect(meter.getAttribute('aria-valuenow')).toBe('0');
    expect(meter.getAttribute('aria-valuetext')).toBe('Too short');

    const segments = getSegments();
    expect(segments).toHaveLength(4);
    expect(segments[0].className).toContain('bg-destructive');
    expect(segments[0].className).not.toContain('bg-muted');
    for (const segment of segments.slice(1)) {
      expect(segment.className).toContain('bg-muted');
    }
  });

  it('level 1 keeps one destructive segment but aria-valuenow=1 / "Weak"', () => {
    renderForm({
      type: 'form',
      data: { secret: 'abcdef' },
      body: [{ type: 'input-password', name: 'secret', label: 'Secret', showStrength: true }],
    });

    const meter = getMeter();
    expect(meter.getAttribute('aria-valuenow')).toBe('1');
    expect(meter.getAttribute('aria-valuetext')).toBe('Weak');
    expect(getSegments()[0].className).toContain('bg-destructive');
  });

  it('level 2 fills two warning segments ("Fair")', () => {
    renderForm({
      type: 'form',
      data: { secret: 'Abcdef1' },
      body: [{ type: 'input-password', name: 'secret', label: 'Secret', showStrength: true }],
    });

    const meter = getMeter();
    expect(meter.getAttribute('aria-valuenow')).toBe('2');
    expect(meter.getAttribute('aria-valuetext')).toBe('Fair');
    const segments = getSegments();
    expect(segments[0].className).toContain('bg-warning');
    expect(segments[1].className).toContain('bg-warning');
    expect(segments[2].className).toContain('bg-muted');
  });

  it('level 3 fills three success segments ("Good")', () => {
    renderForm({
      type: 'form',
      data: { secret: 'Abcdefg1' },
      body: [{ type: 'input-password', name: 'secret', label: 'Secret', showStrength: true }],
    });

    const meter = getMeter();
    expect(meter.getAttribute('aria-valuenow')).toBe('3');
    expect(meter.getAttribute('aria-valuetext')).toBe('Good');
    expect(getSegments()[2].className).toContain('bg-success');
    expect(getSegments()[3].className).toContain('bg-muted');
  });

  it('recomputes level on typing (derived value, no stale state)', async () => {
    renderForm({
      type: 'form',
      data: { secret: '' },
      body: [{ type: 'input-password', name: 'secret', label: 'Secret', showStrength: true }],
    });

    expect(queryMeter()).toBeNull();

    const input = screen.getByLabelText('Secret', { selector: 'input' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abc' } });
    await waitFor(() => expect(getMeter().getAttribute('aria-valuenow')).toBe('0'));

    fireEvent.change(input, { target: { value: 'Abcdef1!' } });
    await waitFor(() => expect(getMeter().getAttribute('aria-valuenow')).toBe('4'));

    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() => expect(queryMeter()).toBeNull());
  });

  it('meter renders in disabled and readOnly states (read-out, not a control)', () => {
    renderForm({
      type: 'form',
      data: { secret: 'Abcdef1!' },
      body: [
        { type: 'input-password', name: 'secret', label: 'Secret', showStrength: true, disabled: true },
      ],
    });
    expect(getMeter().getAttribute('aria-valuenow')).toBe('4');

    cleanup();

    renderForm({
      type: 'form',
      data: { secret: 'Abcdef1!' },
      body: [
        { type: 'input-password', name: 'secret', label: 'Secret', showStrength: true, readOnly: true },
      ],
    });
    expect(getMeter().getAttribute('aria-valuenow')).toBe('4');
  });

  it('meter does not write to form value and does not break the probe contract', () => {
    renderForm({
      type: 'form',
      data: { secret: 'Abcdef1!' },
      body: [
        { type: 'input-password', name: 'secret', label: 'Secret', showStrength: true },
        { type: 'form-state-probe', name: 'secret' },
      ],
    });

    expect(screen.getByTestId('form-state:secret').textContent).toBe(JSON.stringify('Abcdef1!'));
  });

  it('coexists with reveal toggle + clearable + counter (input group branch)', async () => {
    renderForm({
      type: 'form',
      data: { secret: 'Abcdef1!' },
      body: [
        {
          type: 'input-password',
          name: 'secret',
          label: 'Secret',
          showStrength: true,
          revealPassword: true,
          clearable: true,
          showCounter: true,
          maxLength: 20,
        },
      ],
    });

    expect(document.querySelector('[data-slot="input-password-reveal"]')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeTruthy();
    expect(screen.getByText('8 / 20')).toBeTruthy();
    expect(getMeter().getAttribute('aria-valuenow')).toBe('4');

    const input = screen.getByLabelText('Secret', { selector: 'input' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() => expect(queryMeter()).toBeNull());
    expect(document.querySelector('[data-slot="input-password-reveal"]')).toBeTruthy();
  });

  it('keeps input aria-describedby owned by the field frame error chain (strength adds nothing)', () => {
    const { container } = renderForm({
      type: 'form',
      data: { secret: 'Abcdef1!' },
      body: [
        {
          type: 'input-password',
          name: 'secret',
          label: 'Secret',
          showStrength: true,
          required: true,
        },
      ],
    });

    const input = screen.getByLabelText('Secret', { selector: 'input' }) as HTMLInputElement;
    const describedBy = input.getAttribute('aria-describedby');
    if (describedBy) {
      for (const id of describedBy.split(/\s+/)) {
        expect(container.querySelector(`#${CSS.escape(id)}`) ?? document.getElementById(id)).toBeTruthy();
      }
      expect(describedBy).not.toContain('strength');
    }
    expect(queryMeter()).toBeTruthy();
  });

  it('keeps the nop-input-password root marker on the input element', () => {
    const { container } = renderForm({
      type: 'form',
      data: { secret: 'Abcdef1!' },
      body: [{ type: 'input-password', name: 'secret', label: 'Secret', showStrength: true }],
    });

    expect(container.querySelector('input.nop-input-password')).toBeTruthy();
    expect(container.querySelector('.nop-input-password-strength')).toBeTruthy();
  });
});

describe('showStrength — non-password renderers do not consume the field', () => {
  it('input-text does not render a strength meter even when declared', () => {
    renderForm({
      type: 'form',
      data: { code: 'Abcdef1!' },
      body: [{ type: 'input-text', name: 'code', label: 'Code', showStrength: true } as BaseSchema],
    });

    expect(queryMeter()).toBeNull();
    expect(document.querySelector('.nop-input-password-strength')).toBeNull();
  });

  it('input-email does not render a strength meter even when declared', () => {
    renderForm({
      type: 'form',
      data: { email: 'a@b.com' },
      body: [{ type: 'input-email', name: 'email', label: 'Email', showStrength: true } as BaseSchema],
    });

    expect(queryMeter()).toBeNull();
  });
});
