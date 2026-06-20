import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
      schemaUrl="test://form/input-password-reveal"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function queryRevealButton(): HTMLButtonElement | null {
  return document.querySelector('[data-slot="input-password-reveal"]') as HTMLButtonElement | null;
}

function getRevealButton(): HTMLButtonElement {
  const btn = queryRevealButton();
  if (!btn) {
    throw new Error('Expected reveal button to be rendered');
  }
  return btn;
}

describe('input-password — revealPassword (E2a-bis)', () => {
  it('does not render reveal toggle when revealPassword is not declared', () => {
    renderForm({
      type: 'form',
      data: { secret: 'abc' },
      body: [{ type: 'input-password', name: 'secret', label: 'Secret' }],
    });

    expect(queryRevealButton()).toBeNull();
    const input = screen.getByLabelText('Secret') as HTMLInputElement;
    expect(input.type).toBe('password');
  });

  it('does not render reveal toggle when revealPassword is false', () => {
    renderForm({
      type: 'form',
      data: { secret: 'abc' },
      body: [{ type: 'input-password', name: 'secret', label: 'Secret', revealPassword: false }],
    });

    expect(queryRevealButton()).toBeNull();
  });

  it('renders reveal toggle when revealPassword is true (input-password only)', () => {
    renderForm({
      type: 'form',
      data: { secret: 'abc' },
      body: [{ type: 'input-password', name: 'secret', label: 'Secret', revealPassword: true }],
    });

    const reveal = getRevealButton();
    expect(reveal).toBeTruthy();
    expect(reveal.getAttribute('aria-pressed')).toBe('false');
    expect(reveal.getAttribute('aria-label')).toBe('Show password');

    const input = screen.getByLabelText('Secret', { selector: 'input' }) as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(input.closest('[data-slot="input-group"]')).toBeTruthy();
  });

  it('clicking reveal toggle switches <input type> password↔text', () => {
    renderForm({
      type: 'form',
      data: { secret: 'abc' },
      body: [{ type: 'input-password', name: 'secret', label: 'Secret', revealPassword: true }],
    });

    const input = screen.getByLabelText('Secret', { selector: 'input' }) as HTMLInputElement;
    expect(input.type).toBe('password');

    const reveal = getRevealButton();
    fireEvent.click(reveal);

    expect(input.type).toBe('text');
    expect(reveal.getAttribute('aria-pressed')).toBe('true');
    expect(reveal.getAttribute('aria-label')).toBe('Hide password');

    fireEvent.click(reveal);

    expect(input.type).toBe('password');
    expect(reveal.getAttribute('aria-pressed')).toBe('false');
    expect(reveal.getAttribute('aria-label')).toBe('Show password');
  });

  it('toggling reveal does not change form field value (local UI state)', () => {
    renderForm({
      type: 'form',
      data: { secret: 'super-secret' },
      body: [
        { type: 'input-password', name: 'secret', label: 'Secret', revealPassword: true },
        { type: 'form-state-probe', name: 'secret' },
      ],
    });

    const input = screen.getByLabelText('Secret', { selector: 'input' }) as HTMLInputElement;
    const probe = screen.getByTestId('form-state:secret');
    expect(probe.textContent).toBe(JSON.stringify('super-secret'));

    const reveal = getRevealButton();
    fireEvent.click(reveal);

    expect(input.type).toBe('text');
    expect(probe.textContent).toBe(JSON.stringify('super-secret'));

    fireEvent.click(reveal);
    expect(input.type).toBe('password');
    expect(probe.textContent).toBe(JSON.stringify('super-secret'));
  });

  it('reveal toggle coexists with clearable + suffix + counter in inline-end addon (order: suffix → counter → clear → reveal)', () => {
    renderForm({
      type: 'form',
      data: { secret: 'abc' },
      body: [
        {
          type: 'input-password',
          name: 'secret',
          label: 'Secret',
          revealPassword: true,
          clearable: true,
          suffix: 'px',
          showCounter: true,
          maxLength: 10,
        },
      ],
    });

    const endAddon = document.querySelector(
      '[data-slot="input-group-addon"][data-align="inline-end"]',
    );
    expect(endAddon).toBeTruthy();

    const children = Array.from(endAddon!.children);
    const slots = children.map((c) => c.getAttribute('data-slot') ?? c.tagName.toLowerCase());
    expect(slots).toContain('input-counter');
    expect(slots).toContain('input-password-reveal');

    expect(screen.getByText('px')).toBeTruthy();
    expect(screen.getByText('3 / 10')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeTruthy();
    expect(getRevealButton()).toBeTruthy();

    const clearIdx = children.findIndex((c) =>
      c.querySelector('[data-slot="input-group-button"], svg') && c.textContent === '',
    );
    const revealIdx = children.findIndex((c) =>
      c.matches('[data-slot="input-password-reveal"]'),
    );
    const counterIdx = children.findIndex((c) => c.matches('[data-slot="input-counter"]'));
    const suffixIdx = children.findIndex(
      (c) => c.matches('[data-slot="input-group-text"]') && c.textContent === 'px',
    );

    expect(suffixIdx).toBeLessThanOrEqual(counterIdx);
    expect(counterIdx).toBeLessThan(clearIdx === -1 ? children.length : clearIdx);
    expect(revealIdx).toBeGreaterThan(suffixIdx);
    expect(revealIdx).toBeGreaterThan(counterIdx);
  });

  it('reveal toggle is disabled when input is disabled', () => {
    renderForm({
      type: 'form',
      data: { secret: 'abc' },
      body: [
        { type: 'input-password', name: 'secret', label: 'Secret', revealPassword: true, disabled: true },
      ],
    });

    const reveal = getRevealButton();
    expect(reveal.disabled).toBe(true);

    const input = screen.getByLabelText('Secret', { selector: 'input' }) as HTMLInputElement;
    expect(input.type).toBe('password');

    fireEvent.click(reveal);
    expect(input.type).toBe('password');
    expect(reveal.getAttribute('aria-pressed')).toBe('false');
  });

  it('reveal toggle is disabled when input is readOnly', () => {
    renderForm({
      type: 'form',
      data: { secret: 'abc' },
      body: [
        { type: 'input-password', name: 'secret', label: 'Secret', revealPassword: true, readOnly: true },
      ],
    });

    const reveal = getRevealButton();
    expect(reveal.disabled).toBe(true);

    const input = screen.getByLabelText('Secret', { selector: 'input' }) as HTMLInputElement;
    fireEvent.click(reveal);
    expect(input.type).toBe('password');
  });

  it('reveal toggle wraps bare Input in InputGroup when no other enhancement is declared', () => {
    const { container } = renderForm({
      type: 'form',
      data: { secret: 'abc' },
      body: [{ type: 'input-password', name: 'secret', label: 'Secret', revealPassword: true }],
    });

    expect(container.querySelector('[data-slot="input-group"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="input-password-reveal"]')).toBeTruthy();
  });

  it('input-text does not render reveal toggle even when revealPassword is declared', () => {
    renderForm({
      type: 'form',
      data: { code: 'abc' },
      body: [
        { type: 'input-text', name: 'code', label: 'Code', revealPassword: true } as BaseSchema,
      ],
    });

    expect(queryRevealButton()).toBeNull();
    const input = screen.getByLabelText('Code') as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(input.closest('[data-slot="input-group"]')).toBeNull();
  });

  it('input-email does not render reveal toggle even when revealPassword is declared', () => {
    renderForm({
      type: 'form',
      data: { email: 'a@b.com' },
      body: [
        { type: 'input-email', name: 'email', label: 'Email', revealPassword: true } as BaseSchema,
      ],
    });

    expect(queryRevealButton()).toBeNull();
    const input = screen.getByLabelText('Email') as HTMLInputElement;
    expect(input.type).toBe('email');
    expect(input.closest('[data-slot="input-group"]')).toBeNull();
  });

  it('reveal toggle preserves revealed state across clearable clear action value changes', () => {
    renderForm({
      type: 'form',
      data: { secret: 'abc' },
      body: [
        { type: 'input-password', name: 'secret', label: 'Secret', revealPassword: true, clearable: true },
      ],
    });

    const input = screen.getByLabelText('Secret', { selector: 'input' }) as HTMLInputElement;
    const reveal = getRevealButton();
    fireEvent.click(reveal);
    expect(input.type).toBe('text');

    const clearButton = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clearButton);

    expect(input.type).toBe('text');
    expect(reveal.getAttribute('aria-pressed')).toBe('true');
  });

  it('reveal toggle marker has data-slot=input-password-reveal', () => {
    renderForm({
      type: 'form',
      data: { secret: 'abc' },
      body: [{ type: 'input-password', name: 'secret', label: 'Secret', revealPassword: true }],
    });

    const reveal = document.querySelector('[data-slot="input-password-reveal"]');
    expect(reveal).toBeTruthy();
    expect(reveal?.tagName).toBe('BUTTON');
  });
});
