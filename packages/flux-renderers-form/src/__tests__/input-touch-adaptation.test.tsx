import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  return {
    ...actual,
    useIsMobile: () => mobileState.isMobile,
  };
});

const { formRendererDefinitions } = await import('../index.js');
const { env } = await import('./form-test-support.js');

const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

beforeEach(() => {
  mobileState.isMobile = false;
});

afterEach(() => {
  cleanup();
  mobileState.isMobile = false;
});

function renderForm(body: Record<string, unknown>[], data?: Record<string, unknown>) {
  return render(
    <SchemaRenderer
      schemaUrl="test://form/input-touch-adaptation"
      schema={{
        type: 'form',
        ...(data ? { data } : {}),
        body,
      } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

describe('input / textarea / input-number touch adaptation (M2a)', () => {
  it('renders inputmode="email" on input-email', () => {
    renderForm([{ type: 'input-email', name: 'email', label: 'Email' }]);
    const input = document.querySelector('input[type="email"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute('inputmode')).toBe('email');
  });

  it('does not set inputmode on plain input-text by default', () => {
    renderForm([{ type: 'input-text', name: 'title', label: 'Title' }]);
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.hasAttribute('inputmode')).toBe(false);
  });

  it('does not set inputmode on input-password by default', () => {
    renderForm([{ type: 'input-password', name: 'pwd', label: 'Password' }]);
    const input = document.querySelector('input[type="password"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.hasAttribute('inputmode')).toBe(false);
  });

  it('allows schema inputMode prop to override the mapped value', () => {
    renderForm([
      { type: 'input-text', name: 'phone', label: 'Phone', inputMode: 'tel' },
    ]);
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.getAttribute('inputmode')).toBe('tel');
  });

  it('renders inputmode="decimal" on input-number', () => {
    renderForm([{ type: 'input-number', name: 'count', label: 'Count' }]);
    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute('inputmode')).toBe('decimal');
  });

  it('allows input-number schema inputMode prop to override "decimal"', () => {
    renderForm([
      { type: 'input-number', name: 'count', label: 'Count', inputMode: 'numeric' },
    ]);
    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input.getAttribute('inputmode')).toBe('numeric');
  });

  it('keeps font-size >= 16px (text-base) on mobile viewports for input + textarea', () => {
    mobileState.isMobile = true;
    renderForm([
      { type: 'input-text', name: 'title', label: 'Title' },
      { type: 'textarea', name: 'notes', label: 'Notes' },
    ]);
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    // The @nop-chaos/ui Input/Textarea already ship text-base (16px) for mobile,
    // downgrading to text-sm only at the md breakpoint. text-base must always be present.
    expect(input.className).toContain('text-base');
    expect(textarea.className).toContain('text-base');
  });

  it('calls scrollIntoView when an input is focused on mobile', () => {
    mobileState.isMobile = true;
    const scrollIntoView = vi.fn();
    vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollIntoView);

    renderForm([{ type: 'input-text', name: 'title', label: 'Title' }]);
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.focus(input);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });

    vi.restoreAllMocks();
  });

  it('does not call scrollIntoView on desktop when an input is focused', () => {
    mobileState.isMobile = false;
    const scrollIntoView = vi.fn();
    vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollIntoView);

    renderForm([{ type: 'input-text', name: 'title', label: 'Title' }]);
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.focus(input);
    expect(scrollIntoView).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('calls scrollIntoView when textarea is focused on mobile', () => {
    mobileState.isMobile = true;
    const scrollIntoView = vi.fn();
    vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollIntoView);

    renderForm([{ type: 'textarea', name: 'notes', label: 'Notes' }]);
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.focus(textarea);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });

  it('calls scrollIntoView when input-number is focused on mobile', () => {
    mobileState.isMobile = true;
    const scrollIntoView = vi.fn();
    vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollIntoView);

    renderForm([{ type: 'input-number', name: 'count', label: 'Count' }]);
    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.focus(input);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });
});

describe('resolveInputMode mapping (M2a)', () => {
  it('maps email/tel/search/url inputTypes to matching inputmode hints', async () => {
    const { resolveInputMode } = await import('../renderers/mobile-touch-utils.js');
    expect(resolveInputMode('email')).toBe('email');
    expect(resolveInputMode('tel')).toBe('tel');
    expect(resolveInputMode('search')).toBe('search');
    expect(resolveInputMode('url')).toBe('url');
  });

  it('returns undefined for text/password (no keyboard hint by default)', async () => {
    const { resolveInputMode } = await import('../renderers/mobile-touch-utils.js');
    expect(resolveInputMode('text')).toBeUndefined();
    expect(resolveInputMode('password')).toBeUndefined();
  });

  it('lets an explicit override win over the mapped default', async () => {
    const { resolveInputMode } = await import('../renderers/mobile-touch-utils.js');
    expect(resolveInputMode('email', 'text')).toBe('text');
    expect(resolveInputMode('text', 'numeric')).toBe('numeric');
    expect(resolveInputMode('text', '')).toBeUndefined();
  });
});
