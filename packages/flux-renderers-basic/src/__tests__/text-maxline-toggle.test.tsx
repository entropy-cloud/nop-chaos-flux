import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function renderInPage(body: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://text-maxline-toggle"
      schema={{ type: 'page', body: [body] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('text renderer - maxLineToggle', () => {
  it('does not render toggle when maxLineToggle is not set (baseline, backward compatible)', () => {
    const { container } = renderInPage({ type: 'text', text: 'A'.repeat(400), maxLine: 2 });
    expect(container.querySelector('[data-slot="text-maxline-toggle"]')).toBeNull();
  });

  it('does not render toggle when maxLineToggle:false', () => {
    const { container } = renderInPage({
      type: 'text',
      text: 'A'.repeat(400),
      maxLine: 2,
      maxLineToggle: false,
    });
    expect(container.querySelector('[data-slot="text-maxline-toggle"]')).toBeNull();
  });

  it('renders toggle with aria-expanded:false when maxLineToggle:true and content overflows', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 200,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 50,
    });
    try {
      const { container } = renderInPage({
        type: 'text',
        text: 'A'.repeat(400),
        maxLine: 2,
        maxLineToggle: true,
      });
      const toggle = container.querySelector(
        '[data-slot="text-maxline-toggle"]',
      ) as HTMLButtonElement | null;
      expect(toggle).not.toBeNull();
      expect(toggle?.getAttribute('aria-expanded')).toBe('false');
      const root = container.querySelector('.nop-text');
      expect(root?.className).toContain('line-clamp-2');
      expect(root?.getAttribute('data-expanded')).toBe('false');
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get: () => 0,
      });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        get: () => 0,
      });
    }
  });

  it('clicking toggle sets aria-expanded:true and removes line-clamp class; clicking again collapses', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 200,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 50,
    });
    try {
      const { container } = renderInPage({
        type: 'text',
        text: 'A'.repeat(400),
        maxLine: 2,
        maxLineToggle: true,
      });
      const root = container.querySelector('.nop-text');
      const toggle = container.querySelector(
        '[data-slot="text-maxline-toggle"]',
      ) as HTMLButtonElement;

      expect(root?.className).toContain('line-clamp-2');

      fireEvent.click(toggle);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(root?.className).not.toMatch(/line-clamp-\d/);
      expect(root?.getAttribute('data-expanded')).toBe('true');

      fireEvent.click(toggle);
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(root?.className).toContain('line-clamp-2');
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get: () => 0,
      });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        get: () => 0,
      });
    }
  });

  it('does not render toggle when maxLineToggle:true but content does not overflow (Failure Path maxline-toggle-no-overflow)', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 50,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 50,
    });
    try {
      const { container } = renderInPage({
        type: 'text',
        text: 'short',
        maxLine: 2,
        maxLineToggle: true,
      });
      expect(container.querySelector('[data-slot="text-maxline-toggle"]')).toBeNull();
      const root = container.querySelector('.nop-text');
      expect(root?.className).toContain('line-clamp-2');
      expect(root?.getAttribute('data-expanded')).toBeNull();
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get: () => 0,
      });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        get: () => 0,
      });
    }
  });

  it('does not render toggle when maxLineToggle:true but no maxLine is configured (no truncation => no toggle)', () => {
    const { container } = renderInPage({
      type: 'text',
      text: 'A'.repeat(400),
      maxLineToggle: true,
    });
    expect(container.querySelector('[data-slot="text-maxline-toggle"]')).toBeNull();
    const root = container.querySelector('.nop-text');
    expect(root?.className).not.toMatch(/line-clamp-\d/);
  });

  it('preserves copyable button alongside toggle when both are enabled', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 200,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 50,
    });
    try {
      const { container } = renderInPage({
        type: 'text',
        text: 'A'.repeat(400),
        maxLine: 2,
        maxLineToggle: true,
        copyable: true,
      });
      expect(container.querySelector('[data-slot="text-maxline-toggle"]')).not.toBeNull();
      expect(container.querySelector('[data-slot="text-copy-button"]')).not.toBeNull();
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get: () => 0,
      });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        get: () => 0,
      });
    }
  });

  it('toggle button exposes aria-controls matching the controlled content id', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 200,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 50,
    });
    try {
      const { container } = renderInPage({
        type: 'text',
        text: 'A'.repeat(400),
        maxLine: 2,
        maxLineToggle: true,
      });
      const toggle = container.querySelector(
        '[data-slot="text-maxline-toggle"]',
      ) as HTMLButtonElement;
      const controlledId = toggle.getAttribute('aria-controls');
      expect(controlledId).toBeTruthy();
      const root = container.querySelector('.nop-text');
      expect(root?.getAttribute('id')).toBe(controlledId);
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get: () => 0,
      });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        get: () => 0,
      });
    }
  });
});
