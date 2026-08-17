import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

type MatchMediaResult = { matches: boolean; query: string };

function installMatchMedia(results: MatchMediaResult[]) {
  const listeners = new Map<string, Set<() => void>>();
  const matchesFor = (query: string): boolean => {
    const hit = results.find((r) => r.query === query);
    return hit?.matches ?? false;
  };
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matchesFor(query);
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, cb: () => void) => {
      const set = listeners.get(query) ?? new Set();
      set.add(cb);
      listeners.set(query, set);
    },
    removeEventListener: (_type: string, cb: () => void) => {
      listeners.get(query)?.delete(cb);
    },
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
}

const schema: BaseSchema = {
  type: 'page',
  body: [
    {
      type: 'responsive',
      testid: 'resp',
      variants: [
        { key: 'desktop', min: 'lg', body: [{ type: 'text', text: 'DESKTOP TREE' }] },
        { key: 'tablet', min: 768, max: 1024, body: [{ type: 'text', text: 'TABLET TREE' }] },
        { key: 'mobile', body: [{ type: 'text', text: 'MOBILE TREE' }] },
      ],
    },
  ],
};

function renderResponsive() {
  const SchemaRenderer = createLayoutSchemaRenderer();
  return render(
    <SchemaRenderer schemaUrl="test://layout/responsive" schema={schema} env={env} formulaCompiler={formulaCompiler} />,
  );
}

function activeVariant(): string | null {
  const el = document.querySelector('[data-testid="resp"]') as HTMLElement | null;
  return el?.getAttribute('data-active-variant') ?? null;
}

describe('ResponsiveRenderer (structural breakpoint variants)', () => {
  beforeEach(() => {
    // jsdom has no matchMedia by default — install one so the ui hook
    // (useBreakpoints) can drive variant selection per test.
    installMatchMedia([]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the default variant when no bound matches', () => {
    installMatchMedia([
      { query: '(min-width: 1024px)', matches: false },
      { query: '(min-width: 768px) and (max-width: 1023px)', matches: false },
    ]);
    renderResponsive();
    expect(activeVariant()).toBe('mobile');
    expect(screen.getByText('MOBILE TREE')).toBeTruthy();
    expect(screen.queryByText('DESKTOP TREE')).toBeNull();
  });

  it('renders the first matching bound variant in declaration order', () => {
    installMatchMedia([
      { query: '(min-width: 1024px)', matches: true },
      { query: '(min-width: 768px) and (max-width: 1023px)', matches: true },
    ]);
    renderResponsive();
    expect(activeVariant()).toBe('desktop');
    expect(screen.getByText('DESKTOP TREE')).toBeTruthy();
    expect(screen.queryByText('MOBILE TREE')).toBeNull();
  });

  it('falls back to the default variant when matchMedia is unavailable', () => {
    // No matchMedia installed at all → useBreakpoints yields null → default.
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    renderResponsive();
    expect(activeVariant()).toBe('mobile');
    expect(screen.getByText('MOBILE TREE')).toBeTruthy();
  });

  it('honors explicit numeric bounds (tablet variant)', () => {
    installMatchMedia([
      { query: '(min-width: 1024px)', matches: false },
      { query: '(min-width: 768px) and (max-width: 1023px)', matches: true },
    ]);
    renderResponsive();
    expect(activeVariant()).toBe('tablet');
    expect(screen.getByText('TABLET TREE')).toBeTruthy();
    expect(screen.queryByText('DESKTOP TREE')).toBeNull();
  });

  it('rebuilds the subtree when the active variant changes', () => {
    installMatchMedia([
      { query: '(min-width: 1024px)', matches: false },
      { query: '(min-width: 768px) and (max-width: 1023px)', matches: false },
    ]);
    const { rerender } = renderResponsive();
    expect(activeVariant()).toBe('mobile');
    expect(screen.getByText('MOBILE TREE')).toBeTruthy();

    installMatchMedia([
      { query: '(min-width: 1024px)', matches: true },
      { query: '(min-width: 768px) and (max-width: 1023px)', matches: false },
    ]);
    const SchemaRenderer = createLayoutSchemaRenderer();
    rerender(
      <SchemaRenderer schemaUrl="test://layout/responsive" schema={schema} env={env} formulaCompiler={formulaCompiler} />,
    );
    expect(activeVariant()).toBe('desktop');
    expect(screen.getByText('DESKTOP TREE')).toBeTruthy();
    expect(screen.queryByText('MOBILE TREE')).toBeNull();
  });
});
