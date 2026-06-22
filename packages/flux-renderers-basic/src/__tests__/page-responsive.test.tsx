import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseSchema } from '@nop-chaos/flux-core';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  return {
    ...actual,
    useIsMobile: () => mobileState.isMobile,
  };
});

import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

beforeEach(() => {
  mobileState.isMobile = false;
});

afterEach(() => {
  cleanup();
  mobileState.isMobile = false;
  delete (window as unknown as { visualViewport?: unknown }).visualViewport;
});

function renderPage(schema: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://basic/page-responsive"
      schema={schema}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('page renderer — responsive aside (M3a)', () => {
  it('renders inline aside on desktop (no regression)', () => {
    const { container } = renderPage({
      type: 'page',
      title: 'T',
      body: [{ type: 'text', text: 'MAIN BODY' }],
      aside: [{ type: 'text', text: 'ASIDE CONTENT' }],
    } as BaseSchema);

    const aside = container.querySelector('[data-slot="page-aside"]');
    expect(aside).toBeTruthy();
    expect(aside?.textContent).toContain('ASIDE CONTENT');
    expect(container.querySelector('[data-slot="page-aside-toggle"]')).toBeNull();
  });

  it('folds inline aside and shows a trigger on mobile', () => {
    mobileState.isMobile = true;
    const { container } = renderPage({
      type: 'page',
      title: 'T',
      body: [{ type: 'text', text: 'MAIN BODY' }],
      aside: [{ type: 'text', text: 'ASIDE CONTENT' }],
    } as BaseSchema);

    expect(container.querySelector('[data-slot="page-aside"]')).toBeNull();
    const toggle = container.querySelector('[data-slot="page-aside-toggle"]');
    expect(toggle).toBeTruthy();
  });

  it('opens a slide-out Sheet containing the aside content when the mobile toggle is clicked', async () => {
    mobileState.isMobile = true;
    const { container } = renderPage({
      type: 'page',
      title: 'T',
      body: [{ type: 'text', text: 'MAIN BODY' }],
      aside: [{ type: 'text', text: 'ASIDE CONTENT' }],
    } as BaseSchema);

    expect(container.querySelector('[data-slot="page-aside"]')).toBeNull();

    const toggle = container.querySelector('[data-slot="page-aside-toggle"]') as HTMLElement;
    fireEvent.click(toggle);

    await waitFor(() => {
      const asideSheets = document.querySelectorAll('[data-page-aside-sheet="true"]');
      expect(asideSheets.length).toBeGreaterThan(0);
    });
    const sheet = document.querySelector('[data-page-aside-sheet="true"]') as HTMLElement;
    expect(sheet.getAttribute('data-side')).toBe('left');
    expect(sheet.textContent).toContain('ASIDE CONTENT');
  });

  it('places the Sheet on the right when asidePosition is right', async () => {
    mobileState.isMobile = true;
    renderPage({
      type: 'page',
      title: 'T',
      body: [{ type: 'text', text: 'MAIN BODY' }],
      aside: [{ type: 'text', text: 'ASIDE CONTENT' }],
      asidePosition: 'right',
    } as BaseSchema);

    const toggle = document.querySelector('[data-slot="page-aside-toggle"]') as HTMLElement;
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(document.querySelector('[data-page-aside-sheet="true"]')).toBeTruthy();
    });
    const sheet = document.querySelector('[data-page-aside-sheet="true"]') as HTMLElement;
    expect(sheet.getAttribute('data-side')).toBe('right');
  });

  it('does not render the aside toggle on desktop or mobile when aside is absent (no regression)', () => {
    mobileState.isMobile = true;
    const { container } = renderPage({
      type: 'page',
      title: 'T',
      body: [{ type: 'text', text: 'MAIN BODY' }],
    } as BaseSchema);
    expect(container.querySelector('[data-slot="page-aside-toggle"]')).toBeNull();
  });
});

describe('page renderer — responsive toolbar stacking (M3a)', () => {
  it('does not force flex-col on desktop', () => {
    const { container } = renderPage({
      type: 'page',
      title: 'T',
      body: [{ type: 'text', text: 'B' }],
      header: [{ type: 'button', label: 'Action 1' }],
    } as BaseSchema);
    const toolbar = container.querySelector('[data-slot="page-toolbar"]') as HTMLElement;
    expect(toolbar).toBeTruthy();
    expect(toolbar.className).not.toContain('flex-col');
  });

  it('stacks toolbar vertically on mobile', () => {
    mobileState.isMobile = true;
    const { container } = renderPage({
      type: 'page',
      title: 'T',
      body: [{ type: 'text', text: 'B' }],
      header: [{ type: 'button', label: 'Action 1' }],
    } as BaseSchema);
    const toolbar = container.querySelector('[data-slot="page-toolbar"]') as HTMLElement;
    expect(toolbar).toBeTruthy();
    expect(toolbar.className).toContain('flex');
    expect(toolbar.className).toContain('flex-col');
  });
});

describe('page renderer — fixed footer VisualViewport hook (M3a)', () => {
  function setVisualViewport(overrides: Partial<VisualViewport> = {}) {
    const base = {
      height: window.innerHeight,
      offsetTop: 0,
      offsetLeft: 0,
      scale: 1,
      width: window.innerWidth,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      ...overrides,
    } as unknown as VisualViewport;
    Object.defineProperty(window, 'visualViewport', {
      value: base,
      configurable: true,
      writable: true,
    });
    return base;
  }

  it('early-returns when window.visualViewport is unavailable (no inline bottom override)', () => {
    mobileState.isMobile = true;
    delete (window as unknown as { visualViewport?: unknown }).visualViewport;
    const { container } = renderPage({
      type: 'page',
      title: 'T',
      body: [{ type: 'text', text: 'B' }],
      footer: [{ type: 'button', label: 'Submit' }],
      footerClassName: 'fixed bottom-0 inset-x-0 nop-safe-bottom',
    } as BaseSchema);
    const footer = container.querySelector('[data-slot="page-footer"]') as HTMLElement;
    expect(footer).toBeTruthy();
    expect(footer.style.bottom).toBe('');
    expect(footer.getAttribute('data-keyboard-offset')).toBeNull();
  });

  it('keeps bottom override at 0 on desktop even when visualViewport reports a keyboard', () => {
    setVisualViewport({ height: window.innerHeight - 300, offsetTop: 0 });
    const { container } = renderPage({
      type: 'page',
      title: 'T',
      body: [{ type: 'text', text: 'B' }],
      footer: [{ type: 'button', label: 'Submit' }],
      footerClassName: 'fixed bottom-0 inset-x-0 nop-safe-bottom',
    } as BaseSchema);
    const footer = container.querySelector('[data-slot="page-footer"]') as HTMLElement;
    expect(footer).toBeTruthy();
    expect(footer.style.bottom).toBe('');
    expect(footer.getAttribute('data-keyboard-offset')).toBeNull();
  });

  it('applies inline bottom offset when mobile + fixed footer + keyboard is open', async () => {
    mobileState.isMobile = true;
    const listeners: Record<string, ((event: Event) => void) | undefined> = {};
    const vv = setVisualViewport({
      height: window.innerHeight - 300,
      offsetTop: 0,
      addEventListener: vi.fn((type: string, listener: (event: Event) => void) => {
        listeners[type] = listener;
      }),
      removeEventListener: vi.fn(),
    });
    const { container } = renderPage({
      type: 'page',
      title: 'T',
      body: [{ type: 'text', text: 'B' }],
      footer: [{ type: 'button', label: 'Submit' }],
      footerClassName: 'fixed bottom-0 inset-x-0 nop-safe-bottom',
    } as BaseSchema);
    const footer = container.querySelector('[data-slot="page-footer"]') as HTMLElement;
    expect(footer).toBeTruthy();
    expect(footer.style.bottom).toBe('300px');
    expect(footer.getAttribute('data-keyboard-offset')).toBe('300');

    Object.defineProperty(vv, 'height', {
      configurable: true,
      value: window.innerHeight,
    });
    listeners.resize?.(new Event('resize'));
    await waitFor(() => {
      expect(footer.style.bottom).toBe('');
      expect(footer.getAttribute('data-keyboard-offset')).toBeNull();
    });
  });

  it('does not apply offset when footer is not fixed (no false positive)', () => {
    mobileState.isMobile = true;
    setVisualViewport({ height: window.innerHeight - 250, offsetTop: 0 });
    const { container } = renderPage({
      type: 'page',
      title: 'T',
      body: [{ type: 'text', text: 'B' }],
      footer: [{ type: 'button', label: 'Submit' }],
      footerClassName: 'border-t p-3',
    } as BaseSchema);
    const footer = container.querySelector('[data-slot="page-footer"]') as HTMLElement;
    expect(footer).toBeTruthy();
    expect(footer.style.bottom).toBe('');
  });
});
