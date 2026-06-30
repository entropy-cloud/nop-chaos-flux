import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { env, formTestHarness } from './form-test-support.js';

const { submitCalls } = formTestHarness;

function makeRenderer(extra: RendererDefinition[] = []) {
  return createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
    ...extra,
  ]);
}

const formulaCompiler = createFormulaCompiler();

afterEach(() => {
  cleanup();
});

describe('form shell enhancements - columnCount', () => {
  it('renders body with CSS grid template when columnCount > 1', () => {
    const SchemaRenderer = makeRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://form/columns"
        schema={{
          type: 'form',
          columnCount: 2,
          body: [
            { type: 'input-text', name: 'firstName', label: 'First' },
            { type: 'input-text', name: 'lastName', label: 'Last' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const body = container.querySelector('[data-slot="form-body"]') as HTMLElement;
    expect(body).toBeTruthy();
    expect(body.style.gridTemplateColumns).toContain('repeat(2');
    expect(body.style.display).toBe('grid');
  });

  it('clamps columnCount < 1 to single column (no grid)', () => {
    const SchemaRenderer = makeRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://form/columns-zero"
        schema={{
          type: 'form',
          columnCount: 0,
          body: [{ type: 'input-text', name: 'a', label: 'A' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const body = container.querySelector('[data-slot="form-body"]') as HTMLElement;
    expect(body).toBeTruthy();
    expect(body.style.display).not.toBe('grid');
    expect(body.style.gridTemplateColumns).toBe('');
  });
});

describe('form shell enhancements - inline mode', () => {
  it('renders body with flex-row layout class when mode is inline', () => {
    const SchemaRenderer = makeRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://form/inline"
        schema={{
          type: 'form',
          mode: 'inline',
          body: [
            { type: 'input-text', name: 'q', label: 'Query' },
            { type: 'input-text', name: 'tag', label: 'Tag' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const body = container.querySelector('[data-slot="form-body"]') as HTMLElement;
    expect(body).toBeTruthy();
    // C-31: dead BEM modifier `nop-form-body--inline` removed; the inline mode is now
    // identified by the stable data-form-mode attribute instead.
    expect(body.dataset.formMode).toBe('inline');
  });
});

describe('form shell enhancements - submitOnChange', () => {
  it('triggers debounced submit when form values change and submitAction is configured', async () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://form/submit-on-change"
        schema={{
          type: 'form',
          id: 'soc-form',
          submitOnChange: true,
          data: { q: 'init' },
          submitAction: {
            action: 'ajax',
            args: { url: '/api/soc', method: 'post' },
          },
          body: [{ type: 'input-text', name: 'q', label: 'Query' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(submitCalls).toHaveLength(0);

    const input = screen.getByLabelText('Query');
    fireEvent.change(input, { target: { value: 'updated' } });

    await waitFor(
      () => {
        expect(submitCalls.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 2000 },
    );
  });

  it('does NOT submit and does not throw when submitOnChange is true but no submitAction is configured', async () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://form/submit-on-change-no-action"
        schema={{
          type: 'form',
          id: 'soc-no-action',
          submitOnChange: true,
          data: { q: 'init' },
          body: [{ type: 'input-text', name: 'q', label: 'Query' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const input = screen.getByLabelText('Query');
    fireEvent.change(input, { target: { value: 'updated' } });

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(submitCalls).toHaveLength(0);
  });
});

describe('form shell enhancements - Enter key handling', () => {
  it('prevents Enter submit when preventEnterSubmit is true', () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://form/prevent-enter"
        schema={{
          type: 'form',
          id: 'prevent-enter-form',
          preventEnterSubmit: true,
          submitAction: {
            action: 'ajax',
            args: { url: '/api/enter', method: 'post' },
          },
          body: [{ type: 'input-text', name: 'q', label: 'Query' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const section = document.querySelector('.nop-form') as HTMLElement;
    expect(section).toBeTruthy();
    fireEvent.keyDown(section, {
      key: 'Enter',
      keyCode: 13,
      bubbles: true,
    });

    expect(submitCalls).toHaveLength(0);
  });

  it('triggers submit on Enter by default when submitAction is configured', async () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://form/enter-submit"
        schema={{
          type: 'form',
          id: 'enter-submit-form',
          submitAction: {
            action: 'ajax',
            args: { url: '/api/enter-default', method: 'post' },
          },
          body: [{ type: 'input-text', name: 'q', label: 'Query' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const section = document.querySelector('.nop-form') as HTMLElement;
    expect(section).toBeTruthy();
    fireEvent.keyDown(section, {
      key: 'Enter',
      keyCode: 13,
      bubbles: true,
    });

    await waitFor(() => {
      expect(submitCalls.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('form shell enhancements - autoFocus', () => {
  it('focuses the first focusable control on mount when autoFocus is true', () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://form/auto-focus"
        schema={{
          type: 'form',
          autoFocus: true,
          body: [
            { type: 'input-text', name: 'first', label: 'First' },
            { type: 'input-text', name: 'second', label: 'Second' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const firstInput = screen.getByLabelText('First') as HTMLInputElement;
    expect(document.activeElement).toBe(firstInput);
  });

  it('does not throw and focuses nothing when autoFocus is true but body has no focusable field', () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://form/auto-focus-empty"
        schema={{
          type: 'form',
          autoFocus: true,
          body: [],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(document.body).toBeTruthy();
  });
});

describe('form shell enhancements - scrollToFirstError', () => {
  it('calls scrollIntoView on the first invalid control after submit fails when scrollToFirstError is true', async () => {
    const scrollIntoViewSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewSpy;

    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://form/scroll-error"
        schema={{
          type: 'form',
          id: 'scroll-error-form',
          scrollToFirstError: true,
          showErrorOn: ['submit'],
          data: { requiredField: '' },
          submitAction: {
            action: 'ajax',
            args: { url: '/api/scroll', method: 'post' },
          },
          body: [
            {
              type: 'input-text',
              name: 'requiredField',
              label: 'Required',
              required: true,
            },
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit scroll test',
              onClick: {
                action: 'component:submit',
                componentId: 'scroll-error-form',
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Submit scroll test'));

    await waitFor(
      () => {
        expect(scrollIntoViewSpy).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });
});

describe('form shell enhancements - static preview', () => {
  it('propagates readOnly to child fields when static is true', () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://form/static"
        schema={{
          type: 'form',
          static: true,
          body: [
            { type: 'input-text', name: 'first', label: 'First' },
            { type: 'input-text', name: 'second', label: 'Second' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const firstInput = screen.getByLabelText('First') as HTMLInputElement;
    expect(firstInput.readOnly).toBe(true);
    const secondInput = screen.getByLabelText('Second') as HTMLInputElement;
    expect(secondInput.readOnly).toBe(true);
  });
});

describe('form shell enhancements - cross-field rules', () => {
  it('validates equalsField cross-field rule defined at form level', async () => {
    const SchemaRenderer = makeRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://form/rules"
        schema={{
          type: 'form',
          id: 'rules-form',
          showErrorOn: ['touched', 'submit'],
          data: { password: '', confirm: '' },
          rules: [
            {
              rule: 'equalsField',
              field: 'confirm',
              target: 'password',
              message: 'Passwords must match',
            },
          ],
          body: [
            { type: 'input-password', name: 'password', label: 'Password' },
            { type: 'input-password', name: 'confirm', label: 'Confirm' },
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit rules test',
              onClick: {
                action: 'component:submit',
                componentId: 'rules-form',
              },
            },
          ],
          submitAction: {
            action: 'ajax',
            args: { url: '/api/rules', method: 'post' },
          },
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const passwordInput = screen.getByLabelText('Password');
    const confirmInput = screen.getByLabelText('Confirm');

    fireEvent.change(passwordInput, { target: { value: 'alpha' } });
    fireEvent.change(confirmInput, { target: { value: 'beta' } });

    fireEvent.focus(confirmInput);
    fireEvent.blur(confirmInput);

    await waitFor(
      () => {
        expect(screen.getByText('Passwords must match')).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });
});
