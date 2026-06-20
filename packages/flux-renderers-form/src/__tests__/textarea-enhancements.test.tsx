import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env, formStateProbeRenderer } from './form-test-support.js';

// jsdom does not compute layout; resolveTextareaLineHeightPx falls back to
// fontSize(16px) * 1.5 = 24px. Keep this in sync with the renderer fallback.
const RESOLVED_LINE_HEIGHT_PX = 24;

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  cleanup();
  delete (HTMLTextAreaElement.prototype as { scrollHeight?: unknown }).scrollHeight;
});

function installScrollHeightMock() {
  Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
    configurable: true,
    get: function (this: HTMLTextAreaElement) {
      const value = this.value ?? '';
      const lines = value.split('\n').length;
      return Math.max(1, lines) * RESOLVED_LINE_HEIGHT_PX;
    },
  });
}

function renderForm(schema: BaseSchema) {
  cleanup();
  const SchemaRenderer = createSchemaRenderer([
    ...formRendererDefinitions,
    buttonRenderer,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/textarea-enhancements"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function getTextarea(label: string): HTMLTextAreaElement {
  return screen.getByLabelText(label, { selector: 'textarea' }) as HTMLTextAreaElement;
}

describe('textarea auto-height — minRows/maxRows (E2b Phase 2)', () => {
  it('clamps height to maxRows and enables scroll when content overflows (e2b-autoheight-grow)', async () => {
    installScrollHeightMock();
    renderForm({
      type: 'form',
      data: { notes: 'a\nb\nc\nd\ne\nf\ng\nh\ni\nj' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', maxRows: 5 }],
    });

    const textarea = getTextarea('Notes');

    await waitFor(() => {
      expect(textarea.style.height).toBe(`${5 * RESOLVED_LINE_HEIGHT_PX}px`);
    });
    expect(textarea.style.overflowY).toBe('auto');
  });

  it('keeps minRows minimum height when content is small (e2b-autoheight-min)', async () => {
    installScrollHeightMock();
    renderForm({
      type: 'form',
      data: { notes: '' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', minRows: 3 }],
    });

    const textarea = getTextarea('Notes');

    await waitFor(() => {
      expect(textarea.style.height).toBe(`${3 * RESOLVED_LINE_HEIGHT_PX}px`);
    });
    expect(textarea.style.overflowY).toBe('hidden');
  });

  it('clamps between minRows and maxRows', async () => {
    installScrollHeightMock();
    renderForm({
      type: 'form',
      data: { notes: 'a\nb\nc\nd\ne\nf\ng\nh\ni\nj' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', minRows: 2, maxRows: 6 }],
    });

    const textarea = getTextarea('Notes');

    await waitFor(() => {
      expect(textarea.style.height).toBe(`${6 * RESOLVED_LINE_HEIGHT_PX}px`);
    });
  });

  it('content-driven height when only maxRows declared, no minRows (e2b-maxrows-without-min)', async () => {
    installScrollHeightMock();
    renderForm({
      type: 'form',
      data: { notes: 'a\nb' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', maxRows: 6 }],
    });

    const textarea = getTextarea('Notes');

    await waitFor(() => {
      expect(textarea.style.height).toBe(`${2 * RESOLVED_LINE_HEIGHT_PX}px`);
    });
    expect(textarea.style.overflowY).toBe('hidden');
  });

  it('does not set height/overflow styles when minRows/maxRows absent (baseline no drift)', () => {
    renderForm({
      type: 'form',
      data: { notes: 'hello' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes' }],
    });

    const textarea = getTextarea('Notes');
    expect(textarea.style.height).toBe('');
    expect(textarea.style.overflowY).toBe('');
    expect(textarea.getAttribute('rows')).toBe('4');
  });

  it('auto-height measurement does not write form value', async () => {
    installScrollHeightMock();
    renderForm({
      type: 'form',
      data: { notes: 'a\nb\nc\nd\ne\nf\ng\nh\ni\nj' },
      body: [
        { type: 'textarea', name: 'notes', label: 'Notes', maxRows: 3 },
        { type: 'form-state-probe', name: 'notes' },
      ],
    });

    const textarea = getTextarea('Notes');

    await waitFor(() => {
      expect(textarea.style.height).toBe(`${3 * RESOLVED_LINE_HEIGHT_PX}px`);
    });

    const probe = screen.getByTestId('form-state:notes');
    expect(probe.textContent).toBe(JSON.stringify('a\nb\nc\nd\ne\nf\ng\nh\ni\nj'));
  });

  it('re-measures height when value grows past maxRows on change', async () => {
    installScrollHeightMock();
    renderForm({
      type: 'form',
      data: { notes: '' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', maxRows: 4 }],
    });

    const textarea = getTextarea('Notes');
    await waitFor(() => {
      expect(textarea.style.height).toBe(`${1 * RESOLVED_LINE_HEIGHT_PX}px`);
    });

    fireEvent.change(textarea, { target: { value: 'a\nb\nc\nd\ne\nf\ng' } });

    await waitFor(() => {
      expect(textarea.style.height).toBe(`${4 * RESOLVED_LINE_HEIGHT_PX}px`);
    });
    expect(textarea.style.overflowY).toBe('auto');
  });
});

describe('textarea clearable (E2b Phase 3)', () => {
  it('renders clear button when clearable + non-empty value, clears on click', async () => {
    renderForm({
      type: 'form',
      data: { notes: 'abc' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', clearable: true }],
    });

    const textarea = getTextarea('Notes');
    expect(textarea.value).toBe('abc');

    const clearButton = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  it('does not render clear button when value is empty', () => {
    renderForm({
      type: 'form',
      data: { notes: '' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', clearable: true }],
    });

    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('does not render clear button when disabled (e2b-clearable-disabled)', () => {
    renderForm({
      type: 'form',
      data: { notes: 'abc' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', clearable: true, disabled: true }],
    });

    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('does not render clear button when readOnly (e2b-clearable-readonly)', () => {
    renderForm({
      type: 'form',
      data: { notes: 'abc' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', clearable: true, readOnly: true }],
    });

    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });
});

describe('textarea trimContents (E2b Phase 3)', () => {
  it('trims leading/trailing whitespace on blur', async () => {
    renderForm({
      type: 'form',
      data: { notes: '' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', trimContents: true }],
    });

    const textarea = getTextarea('Notes');

    fireEvent.focus(textarea);
    fireEvent.change(textarea, { target: { value: '  hello  ' } });
    expect(textarea.value).toBe('  hello  ');

    fireEvent.blur(textarea);

    await waitFor(() => {
      expect(textarea.value).toBe('hello');
    });
  });

  it('does not trim during change (only on blur)', () => {
    renderForm({
      type: 'form',
      data: { notes: '' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', trimContents: true }],
    });

    const textarea = getTextarea('Notes');

    fireEvent.focus(textarea);
    fireEvent.change(textarea, { target: { value: '  typing  ' } });

    expect(textarea.value).toBe('  typing  ');
  });

  it('trims whitespace-only value to empty string (e2b-trim-all-whitespace)', async () => {
    renderForm({
      type: 'form',
      data: { notes: '' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', trimContents: true }],
    });

    const textarea = getTextarea('Notes');

    fireEvent.focus(textarea);
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.blur(textarea);

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });
});

describe('textarea showCounter (E2b Phase 3)', () => {
  it('shows current/max counter when maxLength declared (e2b-counter-maxlength)', () => {
    renderForm({
      type: 'form',
      data: { notes: 'abc' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', showCounter: true, maxLength: 100 }],
    });

    expect(screen.getByText('3 / 100')).toBeTruthy();
  });

  it('shows only current count when maxLength not declared (e2b-counter-no-maxlength)', () => {
    renderForm({
      type: 'form',
      data: { notes: 'abc' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', showCounter: true }],
    });

    expect(screen.getByText('3')).toBeTruthy();
  });

  it('updates counter in real time as value changes', () => {
    renderForm({
      type: 'form',
      data: { notes: 'abc' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', showCounter: true, maxLength: 10 }],
    });

    expect(screen.getByText('3 / 10')).toBeTruthy();

    const textarea = getTextarea('Notes');
    fireEvent.change(textarea, { target: { value: 'abcdef' } });

    expect(screen.getByText('6 / 10')).toBeTruthy();
  });

  it('renders counter with data-slot=textarea-counter marker', () => {
    const { container } = renderForm({
      type: 'form',
      data: { notes: 'abc' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', showCounter: true, maxLength: 10 }],
    });

    const counter = container.querySelector('[data-slot="textarea-counter"]');
    expect(counter).toBeTruthy();
    expect(counter?.textContent).toBe('3 / 10');
  });
});

describe('textarea native maxLength (E2b Phase 3)', () => {
  it('passes maxLength through to native textarea (e2b-native-maxlength)', () => {
    renderForm({
      type: 'form',
      data: { notes: '' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', maxLength: 100 }],
    });

    const textarea = getTextarea('Notes');
    expect(textarea.getAttribute('maxlength')).toBe('100');
  });

  it('does not set maxlength when maxLength absent', () => {
    renderForm({
      type: 'form',
      data: { notes: '' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes' }],
    });

    const textarea = getTextarea('Notes');
    expect(textarea.getAttribute('maxlength')).toBeNull();
  });
});

describe('textarea enhancements coexistence (E2b)', () => {
  it('counter and clear button coexist with auto-height in footer row', async () => {
    installScrollHeightMock();
    renderForm({
      type: 'form',
      data: { notes: 'a\nb\nc\nd\ne' },
      body: [
        {
          type: 'textarea',
          name: 'notes',
          label: 'Notes',
          showCounter: true,
          clearable: true,
          maxLength: 50,
          minRows: 2,
          maxRows: 4,
        },
      ],
    });

    const textarea = getTextarea('Notes');

    await waitFor(() => {
      expect(textarea.style.height).toBe(`${4 * RESOLVED_LINE_HEIGHT_PX}px`);
    });

    expect(screen.getByText('9 / 50')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeTruthy();

    const wrapper = textarea.closest('[data-slot="textarea-wrapper"]');
    expect(wrapper).toBeTruthy();
    const footer = wrapper?.querySelector('[data-slot="textarea-footer"]');
    expect(footer).toBeTruthy();
    expect(footer?.querySelector('[data-slot="textarea-counter"]')).toBeTruthy();
    expect(footer?.querySelector('[data-slot="textarea-clear"]')).toBeTruthy();
  });

  it('clear button is a button element with data-slot=textarea-clear marker', () => {
    const { container } = renderForm({
      type: 'form',
      data: { notes: 'abc' },
      body: [{ type: 'textarea', name: 'notes', label: 'Notes', clearable: true }],
    });

    const clear = container.querySelector('[data-slot="textarea-clear"]');
    expect(clear).toBeTruthy();
    expect(clear?.tagName).toBe('BUTTON');
  });

  it('counter is outside the textarea element (does not participate in auto-height measurement)', async () => {
    installScrollHeightMock();
    renderForm({
      type: 'form',
      data: { notes: 'abc' },
      body: [
        {
          type: 'textarea',
          name: 'notes',
          label: 'Notes',
          showCounter: true,
          maxLength: 10,
          maxRows: 3,
        },
      ],
    });

    const textarea = getTextarea('Notes');
    await waitFor(() => {
      expect(textarea.style.height).toBe(`${1 * RESOLVED_LINE_HEIGHT_PX}px`);
    });

    const counter = document.querySelector('[data-slot="textarea-counter"]');
    expect(counter).toBeTruthy();
    expect(textarea.contains(counter)).toBe(false);
  });
});
