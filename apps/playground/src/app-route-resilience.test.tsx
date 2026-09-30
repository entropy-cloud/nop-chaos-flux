import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';

vi.mock('@nop-chaos/flux-formula', () => ({
  createFormulaCompiler: () => ({}),
  createFormulaRegistry: () => ({ registerNamespace: () => undefined }),
}));

vi.mock('@nop-chaos/flux-renderers-basic', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nop-chaos/flux-renderers-basic')>()),
  registerBasicRenderers: () => undefined,
}));
vi.mock('@nop-chaos/flux-renderers-form', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nop-chaos/flux-renderers-form')>()),
  registerFormRenderers: () => undefined,
}));
vi.mock('@nop-chaos/flux-renderers-form-advanced', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nop-chaos/flux-renderers-form-advanced')>()),
  registerFormAdvancedRenderers: () => undefined,
}));
vi.mock('@nop-chaos/flux-renderers-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nop-chaos/flux-renderers-data')>()),
  registerDataRenderers: () => undefined,
}));
vi.mock('@nop-chaos/flux-renderers-map', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nop-chaos/flux-renderers-map')>()),
  registerMapRenderers: () => undefined,
}));
vi.mock('@nop-chaos/flux-renderers-pivot', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nop-chaos/flux-renderers-pivot')>()),
  registerPivotRenderers: () => undefined,
}));
vi.mock('@nop-chaos/flux-renderers-industrial', () => ({
  registerScadaRenderers: () => undefined,
  registerScadaSymbols: () => undefined,
}));
vi.mock('@nop-chaos/flux-renderers-industrial/editor', () => ({
  registerScadaEditorRenderers: () => undefined,
  createInMemoryTemplateStorage: () => ({
    listTemplates: async () => [],
    saveTemplate: async () => undefined,
    deleteTemplate: async () => undefined,
  }),
  createInMemoryStationStorage: () => ({
    loadStation: async () => null,
    saveStation: async () => undefined,
    loadScreen: async () => null,
    saveScreen: async () => undefined,
    deleteScreen: async () => undefined,
  }),
}));

vi.mock('@nop-chaos/flux-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-react')>();
  return {
    ...actual,
    createDefaultRegistry: () => ({ register: () => undefined }),
    createSchemaRenderer: () => {
      return function MockSchemaRenderer() {
        return <div data-testid="mock-schema-renderer" />;
      };
    },
  };
});

vi.mock('@nop-chaos/nop-debugger', () => ({
  NopDebuggerPanel: () => null,
  createNopDebugger: () => ({
    id: 'test',
    getSnapshot: () => ({
      enabled: true,
      panelOpen: false,
      paused: false,
      events: [],
      filters: [],
      activeTab: 'timeline',
      position: { x: 24, y: 24 },
    }),
    subscribe: () => () => undefined,
    decorateEnv: (env: unknown) => env,
    plugin: {},
    onActionError: () => undefined,
  }),
}));

vi.mock('./pages/home-page', () => ({
  HomePage: () => <div data-testid="home-page" />,
}));

// R3-U5: this lazy chunk rejects on import — a stand-in for a stale deployment chunk.
vi.mock('./pages/word-editor-page', () => {
  throw new Error('chunk load failed');
});

import { App } from './App';

function setHash(hash: string) {
  window.location.hash = hash;
}

describe('App shell resilience (R3-U5 / R3-U32)', () => {
  beforeEach(() => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    setHash('#/');
  });

  afterEach(() => {
    cleanup();
    setHash('#/');
    resetFluxI18n();
  });

  it('renders an explicit domain-not-found state with a working back-home entry (R3-U32)', async () => {
    setHash('#/dingtalk-flow-demo');
    render(<App />);

    const notFound = await screen.findByTestId('domain-not-found');
    expect(notFound.textContent).toContain('dingtalk-flow-demo');
    expect(notFound.textContent).toContain('not available');

    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }));
    expect(screen.getByTestId('home-page')).toBeTruthy();
    expect(window.location.hash).toBe('#/');
  });

  // R3-U2 browser-back: hash history + hashchange emulation is not reliable in
  // happy-dom, so the back-navigability guard lives in the e2e
  // navigation.spec.ts (playwright).

  it('catches a failed lazy chunk and renders the reload fallback (R3-U5)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setHash('#/word-editor');
    render(<App />);

    const boundary = await screen.findByTestId('route-error-boundary');
    expect(boundary.textContent).toContain('Page failed to load');
    expect(boundary.textContent).toContain('Reload page');

    vi.spyOn(console, 'error').mockRestore();
  });

  it('resets the boundary when the route changes away and back (R3-U5 resetKeys)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setHash('#/word-editor');
    const { unmount } = render(<App />);
    await screen.findByTestId('route-error-boundary');

    // Navigation to another route resets the caught error → new route renders.
    setHash('#/');
    await screen.findByTestId('home-page');

    // Navigating back into the broken chunk fails again (still guarded).
    setHash('#/word-editor');
    await screen.findByTestId('route-error-boundary');

    errorSpy.mockRestore();
    unmount();
  });

  it('resets the boundary on a same-kind route switch (R3-U5 routeKey granularity)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setHash('#/word-editor');
    const { unmount } = render(<App />);
    await screen.findByTestId('route-error-boundary');

    // Same route kind ('domain'), different id: the tripped boundary must
    // still reset so the new domain renders instead of a stuck error screen
    // (dingtalk-flow-demo renders the explicit not-found state).
    setHash('#/dingtalk-flow-demo');
    await screen.findByTestId('domain-not-found');
    expect(screen.queryByTestId('route-error-boundary')).toBeNull();

    errorSpy.mockRestore();
    unmount();
  });
});
