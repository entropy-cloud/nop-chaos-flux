import { cleanup, fireEvent, render, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { toast } from '@nop-chaos/ui';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  const toastFn = vi.fn() as unknown as ReturnType<typeof import('@nop-chaos/ui')['toast']> & {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
  };
  toastFn.success = vi.fn();
  toastFn.error = vi.fn();
  toastFn.info = vi.fn();
  toastFn.warning = vi.fn();
  return { ...actual, toast: toastFn };
});

function renderInPage(body: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://text-icon-visual-fields"
      schema={{ type: 'page', body: [body] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('text renderer - copyable', () => {
  let originalClipboard: typeof navigator.clipboard | undefined;

  beforeEach(() => {
    originalClipboard = navigator.clipboard;
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast).mockClear();
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
  });

  it('renders a copy button with data-slot="text-copy-button" when copyable=true', () => {
    const { container } = renderInPage({ type: 'text', text: 'Copy me', copyable: true });
    const button = container.querySelector('[data-slot="text-copy-button"]');
    expect(button).toBeTruthy();
  });

  it('does not render a copy button when copyable is not set (baseline)', () => {
    const { container } = renderInPage({ type: 'text', text: 'Plain' });
    expect(container.querySelector('[data-slot="text-copy-button"]')).toBeNull();
  });

  it('calls navigator.clipboard.writeText with text content on click and shows success toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    const { container } = renderInPage({ type: 'text', text: 'hello-world', copyable: true });
    const button = container.querySelector(
      '[data-slot="text-copy-button"]',
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('hello-world');
    });
    expect(toast.success).toHaveBeenCalled();
  });

  it('falls back gracefully when clipboard is unavailable (Failure Path clipboard-unavail)', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { container } = renderInPage({ type: 'text', text: 'try-copy', copyable: true });
    const button = container.querySelector(
      '[data-slot="text-copy-button"]',
    ) as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});

describe('text renderer - maxLine', () => {
  afterEach(cleanup);

  it('applies line-clamp-2 class to root when maxLine=2', () => {
    const { container } = renderInPage({
      type: 'text',
      text: 'A'.repeat(400),
      maxLine: 2,
    });
    const root = container.querySelector('.nop-text');
    expect(root).toBeTruthy();
    expect(root?.className).toContain('line-clamp-2');
  });

  it('does not apply any line-clamp class when maxLine is not set (baseline)', () => {
    const { container } = renderInPage({ type: 'text', text: 'Plain text' });
    const root = container.querySelector('.nop-text');
    expect(root).toBeTruthy();
    expect(root?.className).not.toMatch(/line-clamp-\d/);
  });

  it('applies line-clamp-3 class when maxLine=3', () => {
    const { container } = renderInPage({
      type: 'text',
      text: 'B'.repeat(400),
      maxLine: 3,
    });
    const root = container.querySelector('.nop-text');
    expect(root?.className).toContain('line-clamp-3');
  });
});

describe('icon renderer - size', () => {
  afterEach(cleanup);

  it('passes size to lucide icon when size=24 (overrides hardcoded 16)', () => {
    const { container } = renderInPage({ type: 'icon', icon: 'star', size: 24 });
    const svg = container.querySelector('.nop-icon') as SVGElement | null;
    expect(svg).toBeTruthy();
    const widthAttr = svg?.getAttribute('width');
    expect(widthAttr === '24' || svg?.style.width === '24px').toBe(true);
  });

  it('defaults size to 16 when size is not set (baseline)', () => {
    const { container } = renderInPage({ type: 'icon', icon: 'star' });
    const svg = container.querySelector('.nop-icon') as SVGElement | null;
    expect(svg).toBeTruthy();
    const widthAttr = svg?.getAttribute('width');
    expect(widthAttr === '16' || svg?.style.width === '16px').toBe(true);
  });
});

describe('icon renderer - color', () => {
  afterEach(cleanup);

  it('applies color via inline style when color="#ff0000"', () => {
    const { container } = renderInPage({ type: 'icon', icon: 'star', color: '#ff0000' });
    const svg = container.querySelector('.nop-icon') as SVGElement | null;
    expect(svg).toBeTruthy();
    expect(svg?.style.color).toBe('#ff0000');
  });

  it('does not apply inline color when color is not set (baseline)', () => {
    const { container } = renderInPage({ type: 'icon', icon: 'star' });
    const svg = container.querySelector('.nop-icon') as SVGElement | null;
    expect(svg).toBeTruthy();
    expect(svg?.style.color).toBe('');
  });
});
