import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  resetFluxI18n();
});

function renderForm(schema: BaseSchema) {
  cleanup();
  const SchemaRenderer = createSchemaRenderer([
    ...formRendererDefinitions,
    buttonRenderer,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/input-text-enhancements"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

const inputTypeCases: Array<{ label: string; type: string }> = [
  { label: 'input-text', type: 'input-text' },
  { label: 'input-password', type: 'input-password' },
];

describe('input-text family — prefix / suffix (E2a)', () => {
  it('renders prefix as inline-start addon text', () => {
    renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [
        { type: 'input-text', name: 'code', label: 'Code', prefix: '$' },
      ],
    });

    const input = screen.getByLabelText('Code') as HTMLInputElement;
    const group = input.closest('[data-slot="input-group"]');
    expect(group).toBeTruthy();
    expect(group?.querySelector('[data-slot="input-group-addon"][data-align="inline-start"]')).toBeTruthy();
    expect(screen.getByText('$')).toBeTruthy();
    expect(input.getAttribute('data-slot')).toBe('input-group-control');
  });

  it('renders suffix as inline-end addon text', () => {
    renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [
        { type: 'input-text', name: 'code', label: 'Code', suffix: 'px' },
      ],
    });

    const input = screen.getByLabelText('Code') as HTMLInputElement;
    const group = input.closest('[data-slot="input-group"]');
    expect(group).toBeTruthy();
    expect(screen.getByText('px')).toBeTruthy();
  });

  it('renders both prefix and suffix addons when both declared', () => {
    renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [
        { type: 'input-text', name: 'code', label: 'Code', prefix: 'pre', suffix: 'post' },
      ],
    });

    expect(screen.getByText('pre')).toBeTruthy();
    expect(screen.getByText('post')).toBeTruthy();
  });

  it('does not wrap in InputGroup when neither prefix nor suffix is declared', () => {
    const { container } = renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [{ type: 'input-text', name: 'code', label: 'Code' }],
    });

    expect(container.querySelector('[data-slot="input-group"]')).toBeNull();
    const input = screen.getByLabelText('Code') as HTMLInputElement;
    expect(input.getAttribute('data-slot')).toBe('input');
  });

  it('prefix/suffix coexist with maxLength native attr', () => {
    renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [
        { type: 'input-text', name: 'code', label: 'Code', prefix: '$', maxLength: 5 },
      ],
    });

    const input = screen.getByLabelText('Code') as HTMLInputElement;
    expect(input.getAttribute('maxlength')).toBe('5');
    expect(screen.getByText('$')).toBeTruthy();
  });
});

describe('input-text family — clearable (E2a)', () => {
  it('renders clear button when clearable + non-empty value, clears on click', async () => {
    renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [{ type: 'input-text', name: 'code', label: 'Code', clearable: true }],
    });

    const input = screen.getByLabelText('Code', { selector: 'input' }) as HTMLInputElement;
    expect(input.value).toBe('abc');

    const clearButton = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('does not render clear button when clearable but value is empty', () => {
    renderForm({
      type: 'form',
      data: { code: '' },
      body: [{ type: 'input-text', name: 'code', label: 'Code', clearable: true }],
    });

    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('does not render clear button when clearable is false', () => {
    renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [{ type: 'input-text', name: 'code', label: 'Code', clearable: false }],
    });

    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('does not render clear button when disabled', () => {
    renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [{ type: 'input-text', name: 'code', label: 'Code', clearable: true, disabled: true }],
    });

    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('does not render clear button when readOnly', () => {
    renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [{ type: 'input-text', name: 'code', label: 'Code', clearable: true, readOnly: true }],
    });

    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('clear button coexists with suffix in inline-end addon', () => {
    renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [
        { type: 'input-text', name: 'code', label: 'Code', clearable: true, suffix: 'px' },
      ],
    });

    expect(screen.getByText('px')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeTruthy();
  });
});

describe('input-text family — trimContents (E2a)', () => {
  it('trims leading/trailing whitespace on blur', async () => {
    renderForm({
      type: 'form',
      data: { code: '' },
      body: [{ type: 'input-text', name: 'code', label: 'Code', trimContents: true }],
    });

    const input = screen.getByLabelText('Code') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '  hello  ' } });
    expect(input.value).toBe('  hello  ');

    fireEvent.blur(input);

    await waitFor(() => {
      expect(input.value).toBe('hello');
    });
  });

  it('does not trim during change (only on blur)', () => {
    renderForm({
      type: 'form',
      data: { code: '' },
      body: [{ type: 'input-text', name: 'code', label: 'Code', trimContents: true }],
    });

    const input = screen.getByLabelText('Code') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '  typing  ' } });

    expect(input.value).toBe('  typing  ');
  });

  it('does not trim on blur when trimContents is false', () => {
    renderForm({
      type: 'form',
      data: { code: '' },
      body: [{ type: 'input-text', name: 'code', label: 'Code', trimContents: false }],
    });

    const input = screen.getByLabelText('Code') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '  hello  ' } });
    fireEvent.blur(input);

    expect(input.value).toBe('  hello  ');
  });

  it('trims whitespace-only value to empty string', async () => {
    renderForm({
      type: 'form',
      data: { code: '' },
      body: [{ type: 'input-text', name: 'code', label: 'Code', trimContents: true }],
    });

    const input = screen.getByLabelText('Code') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });
});

describe('input-text family — showCounter (E2a)', () => {
  it('shows current/max counter when maxLength is declared', () => {
    renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [{ type: 'input-text', name: 'code', label: 'Code', showCounter: true, maxLength: 10 }],
    });

    expect(screen.getByText('3 / 10')).toBeTruthy();
  });

  it('shows only current count when maxLength is not declared', () => {
    renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [{ type: 'input-text', name: 'code', label: 'Code', showCounter: true }],
    });

    expect(screen.getByText('3')).toBeTruthy();
  });

  it('updates counter in real time as value changes', () => {
    renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [{ type: 'input-text', name: 'code', label: 'Code', showCounter: true, maxLength: 10 }],
    });

    expect(screen.getByText('3 / 10')).toBeTruthy();

    const input = screen.getByLabelText('Code') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abcdef' } });

    expect(screen.getByText('6 / 10')).toBeTruthy();
  });

  it('does not render counter when showCounter is false', () => {
    renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [{ type: 'input-text', name: 'code', label: 'Code', showCounter: false, maxLength: 10 }],
    });

    expect(screen.queryByText('3 / 10')).toBeNull();
  });

  it('counter renders with data-slot=input-counter marker', () => {
    const { container } = renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [{ type: 'input-text', name: 'code', label: 'Code', showCounter: true, maxLength: 10 }],
    });

    const counter = container.querySelector('[data-slot="input-counter"]');
    expect(counter).toBeTruthy();
    expect(counter?.textContent).toBe('3 / 10');
  });
});

describe('input-text family — nativeAutoComplete (E2a)', () => {
  it('passes autocomplete attribute through to native input when declared', () => {
    renderForm({
      type: 'form',
      data: { email: '' },
      body: [
        { type: 'input-email', name: 'email', label: 'Email', nativeAutoComplete: 'email' },
      ],
    });

    const input = screen.getByLabelText('Email') as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBe('email');
  });

  it('passes autocomplete="off" through', () => {
    renderForm({
      type: 'form',
      data: { code: '' },
      body: [
        { type: 'input-text', name: 'code', label: 'Code', nativeAutoComplete: 'off' },
      ],
    });

    const input = screen.getByLabelText('Code') as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBe('off');
  });

  it('does not set autocomplete attribute when nativeAutoComplete is not declared', () => {
    renderForm({
      type: 'form',
      data: { code: '' },
      body: [{ type: 'input-text', name: 'code', label: 'Code' }],
    });

    const input = screen.getByLabelText('Code') as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBeNull();
  });

  it('nativeAutoComplete coexists with disabled state', () => {
    renderForm({
      type: 'form',
      data: { code: '' },
      body: [
        {
          type: 'input-text',
          name: 'code',
          label: 'Code',
          nativeAutoComplete: 'off',
          disabled: true,
        },
      ],
    });

    const input = screen.getByLabelText('Code') as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.disabled).toBe(true);
  });
});

describe('input-text family — shared enhancements across text and password renderers', () => {
  for (const { label: rendererLabel, type } of inputTypeCases) {
    describe(`${rendererLabel} shares prefix/suffix/clearable/showCounter/nativeAutoComplete`, () => {
      it(`${rendererLabel} renders prefix + suffix`, () => {
        renderForm({
          type: 'form',
          data: { secret: 'abc' },
          body: [
            { type, name: 'secret', label: 'Secret', prefix: 'P', suffix: 'S' },
          ],
        });

        expect(screen.getByText('P')).toBeTruthy();
        expect(screen.getByText('S')).toBeTruthy();
      });

      it(`${rendererLabel} renders clearable button`, async () => {
        renderForm({
          type: 'form',
          data: { secret: 'abc' },
          body: [{ type, name: 'secret', label: 'Secret', clearable: true }],
        });

        const clearButton = screen.getByRole('button', { name: 'Clear' });
        fireEvent.click(clearButton);

        const input = screen.getByLabelText('Secret', { selector: 'input' }) as HTMLInputElement;
        await waitFor(() => {
          expect(input.value).toBe('');
        });
      });

      it(`${rendererLabel} renders showCounter with maxLength`, () => {
        renderForm({
          type: 'form',
          data: { secret: 'abc' },
          body: [
            { type, name: 'secret', label: 'Secret', showCounter: true, maxLength: 8 },
          ],
        });

        expect(screen.getByText('3 / 8')).toBeTruthy();
      });

      it(`${rendererLabel} passes nativeAutoComplete through`, () => {
        renderForm({
          type: 'form',
          data: { secret: '' },
          body: [
            { type, name: 'secret', label: 'Secret', nativeAutoComplete: 'current-password' },
          ],
        });

        const input = screen.getByLabelText('Secret') as HTMLInputElement;
        expect(input.getAttribute('autocomplete')).toBe('current-password');
      });
    });
  }
});
