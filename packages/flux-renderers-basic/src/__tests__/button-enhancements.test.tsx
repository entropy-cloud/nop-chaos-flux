import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function renderButton(schema: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://button-enhancements"
      schema={{ type: 'page', body: [schema] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('button enhancements (E2e)', () => {
  afterEach(() => cleanup());

  describe('icon / rightIcon', () => {
    it('renders left icon with data-icon="inline-start"', () => {
      const { container } = renderButton({
        type: 'button',
        label: 'Save',
        icon: 'check',
        testid: 'save-btn',
      });
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).toBeTruthy();
      const leftIcon = container.querySelector('[data-icon="inline-start"]');
      expect(leftIcon).toBeTruthy();
    });

    it('renders right icon with data-icon="inline-end"', () => {
      const { container } = renderButton({
        type: 'button',
        label: 'Next',
        rightIcon: 'chevron-right',
      });
      const rightIcon = container.querySelector('[data-icon="inline-end"]');
      expect(rightIcon).toBeTruthy();
    });

    it('does not render an svg when icon name is invalid', () => {
      const { container } = renderButton({
        type: 'button',
        label: 'Fallback',
        icon: 'totallyNonExistentIconName',
      });
      expect(container.querySelector('[data-icon="inline-start"]')).toBeNull();
      expect(screen.getByRole('button', { name: 'Fallback' })).toBeTruthy();
    });
  });

  describe('loading', () => {
    it('renders a spinner and forces disabled when loading is true', () => {
      const { container } = renderButton({
        type: 'button',
        label: 'Saving',
        loading: true,
        testid: 'loading-btn',
      });
      const button = container.querySelector<HTMLButtonElement>(
        'button[data-testid="loading-btn"]',
      );
      expect(button).toBeTruthy();
      expect(button?.disabled).toBe(true);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toBeTruthy();
    });

    it('forces disabled even when explicit disabled is false', () => {
      renderButton({
        type: 'button',
        label: 'Submit',
        loading: true,
        disabled: false,
        testid: 'loading-submit',
      });
      const button = screen
        .getByTestId('loading-submit')
        .closest('button') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.disabled).toBe(true);
    });

    it('does not fire onClick while loading', () => {
      const SchemaRenderer = createBasicSchemaRenderer();
      const { container } = render(
        <SchemaRenderer
          schemaUrl="test://button-loading-click"
          schema={{
            type: 'page',
            body: [
              {
                type: 'button',
                label: 'Load',
                loading: true,
                testid: 'load-btn',
                onClick: { action: 'setValue', args: { path: 'clicked', value: true } },
              },
              { type: 'text', text: 'Result: ${clicked}' },
            ],
          }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );
      const button = container.querySelector<HTMLButtonElement>(
        'button[data-testid="load-btn"]',
      );
      expect(button).toBeTruthy();
      fireEvent.click(button!);
      expect(screen.getByText(/Result:/)).toBeTruthy();
      expect(screen.queryByText('Result: true')).toBeNull();
    });
  });

  describe('tooltip / disabledTip', () => {
    it('attaches tooltip text mirror when tooltip is set', () => {
      renderButton({
        type: 'button',
        label: 'Help',
        tooltip: '提示文字',
      });
      const button = screen.getByRole('button', { name: 'Help' });
      expect(button.getAttribute('data-tooltip')).toBe('提示文字');
    });

    it('switches to disabledTip when disabled', () => {
      renderButton({
        type: 'button',
        label: 'Action',
        disabled: true,
        tooltip: '正常提示',
        disabledTip: '禁用提示',
      });
      const button = screen.getByRole('button', { name: 'Action' });
      expect(button.getAttribute('data-tooltip')).toBe('禁用提示');
    });

    it('does not attach tooltip mirror when neither tooltip nor disabledTip is set', () => {
      renderButton({ type: 'button', label: 'Plain' });
      const button = screen.getByRole('button', { name: 'Plain' });
      expect(button.hasAttribute('data-tooltip')).toBe(false);
    });
  });

  describe('block', () => {
    it('adds w-full class when block is true', () => {
      renderButton({ type: 'button', label: 'Full', block: true });
      const button = screen.getByRole('button', { name: 'Full' });
      expect(button.className).toContain('w-full');
    });

    it('does not add w-full when block is not set', () => {
      renderButton({ type: 'button', label: 'Auto' });
      const button = screen.getByRole('button', { name: 'Auto' });
      expect(button.className).not.toContain('w-full');
    });
  });

  describe('active', () => {
    it('sets data-active and aria-pressed when active is true', () => {
      renderButton({ type: 'button', label: 'Toggle', active: true });
      const button = screen.getByRole('button', { name: 'Toggle' });
      expect(button.getAttribute('data-active')).toBe('true');
      expect(button.getAttribute('aria-pressed')).toBe('true');
    });

    it('omits data-active and aria-pressed when active is not set', () => {
      renderButton({ type: 'button', label: 'Idle' });
      const button = screen.getByRole('button', { name: 'Idle' });
      expect(button.hasAttribute('data-active')).toBe(false);
      expect(button.hasAttribute('aria-pressed')).toBe(false);
    });
  });

  describe('regression - baseline behavior', () => {
    it('renders label and variant/size unchanged', () => {
      renderButton({ type: 'button', label: 'Baseline', variant: 'outline', size: 'lg' });
      const button = screen.getByRole('button', { name: 'Baseline' });
      expect(button).toBeTruthy();
      expect(button.className).toContain('border');
    });

    it('fires onClick when not disabled and not loading', () => {
      const SchemaRenderer = createBasicSchemaRenderer();
      render(
        <SchemaRenderer
          schemaUrl="test://button-regression"
          schema={{
            type: 'page',
            body: [
              { type: 'button', label: 'Click', onClick: { action: 'setValue', args: { path: 'clicked', value: true } } },
              { type: 'text', text: 'Result: ${clicked}' },
            ],
          }}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );
      const button = screen.getByRole('button', { name: 'Click' });
      fireEvent.click(button);
      expect(screen.getByText('Result: true')).toBeTruthy();
    });

    it('respects explicit disabled', () => {
      renderButton({ type: 'button', label: 'Off', disabled: true });
      const button = screen.getByRole('button', { name: 'Off' }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });
  });

  // B6.2 — button 契约回归锚（B1 disabled-expr LOCK / B3 label `&` 忠实渲染 TEST-GAP）
  describe('contract regression anchors (B6.2: B1 disabled-expr / B3 label)', () => {
    function renderWithScope(schema: BaseSchema, data: Record<string, unknown>) {
      const SchemaRenderer = createBasicSchemaRenderer();
      return render(
        <SchemaRenderer
          schemaUrl="test://button-contract"
          schema={{ type: 'page', body: [schema] }}
          data={data}
          env={env}
          formulaCompiler={formulaCompiler}
        />,
      );
    }

    it('B1: disabled from scope expression resolves to enabled when expr is false', () => {
      const { container } = renderWithScope(
        { type: 'button', label: 'Toggle', testid: 'btn', disabled: '${!isAdmin}' },
        { isAdmin: true },
      );
      const button = container.querySelector<HTMLButtonElement>('button[data-testid="btn"]');
      expect(button).toBeTruthy();
      // isAdmin === true → !isAdmin === false → DOM button is NOT disabled.
      expect(button?.disabled).toBe(false);
    });

    it('B1: disabled from scope expression resolves to disabled when expr is true', () => {
      const { container } = renderWithScope(
        { type: 'button', label: 'Toggle', testid: 'btn', disabled: '${!isAdmin}' },
        { isAdmin: false },
      );
      const button = container.querySelector<HTMLButtonElement>('button[data-testid="btn"]');
      expect(button).toBeTruthy();
      // isAdmin === false → !isAdmin === true → DOM button IS disabled.
      expect(button?.disabled).toBe(true);
    });

    it('B3: label expression renders literal `&` text faithfully (single-layer escape, no double-escape)', () => {
      const { container } = renderWithScope(
        { type: 'button', testid: 'btn', label: '${name}' },
        { name: 'A & B' },
      );
      const button = container.querySelector<HTMLButtonElement>('button[data-testid="btn"]');
      expect(button).toBeTruthy();
      // textContent decodes entities → the source text 'A & B' survives intact.
      expect(button?.textContent).toBe('A & B');
      // The serialized HTML carries exactly one entity for the literal ampersand
      // (React's standard text escape), never a double-escaped '&amp;amp;'.
      expect(button?.innerHTML).not.toContain('&amp;amp;');
    });
  });
});
