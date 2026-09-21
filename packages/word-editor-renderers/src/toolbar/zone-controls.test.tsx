// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { EditorStoreApi, EditorZone } from '@nop-chaos/word-editor-core';
import { ZoneControls } from './zone-controls.js';

const ZONES: Record<'header' | 'main' | 'footer', EditorZone> = {
  header: 'header',
  main: 'main',
  footer: 'footer',
};

function makeStore() {
  return {
    setActiveZone: vi.fn(),
  } as unknown as EditorStoreApi;
}

function makeBridge(command: Record<string, unknown> | null) {
  return { command } as unknown as import('@nop-chaos/word-editor-core').CanvasEditorBridge;
}

function setup({
  bridge = makeBridge({ executeSetZone: vi.fn() }),
  activeZone = ZONES.main,
  store = makeStore(),
  isReady = true,
}: {
  bridge?: import('@nop-chaos/word-editor-core').CanvasEditorBridge | null;
  activeZone?: EditorZone;
  store?: EditorStoreApi;
  isReady?: boolean;
} = {}) {
  render(
    <ZoneControls bridge={bridge} editorStore={store} activeZone={activeZone} isReady={isReady} />,
  );
  return { store, bridge };
}

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('ZoneControls', () => {
  it('renders the header / main / footer switcher with the active zone pressed', () => {
    setup({ activeZone: ZONES.main });

    expect(screen.getByTestId('zone-toggle-header').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('zone-toggle-main').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('zone-toggle-footer').getAttribute('aria-pressed')).toBe('false');
  });

  it('optimistically flips the activation state and drives executeSetZone on click', () => {
    const store = makeStore();
    const executeSetZone = vi.fn();
    setup({ store, bridge: makeBridge({ executeSetZone }), activeZone: ZONES.main });

    fireEvent.click(screen.getByTestId('zone-toggle-footer'));

    expect(store.setActiveZone).toHaveBeenCalledWith(ZONES.footer);
    expect(executeSetZone).toHaveBeenCalledWith(ZONES.footer);
  });

  it('follows canvas-driven zone changes passed through the active zone state', () => {
    const store = makeStore();
    const { rerender } = render(
      <ZoneControls
        bridge={makeBridge({ executeSetZone: vi.fn() })}
        editorStore={store}
        activeZone={ZONES.main}
        isReady={true}
      />,
    );

    rerender(
      <ZoneControls
        bridge={makeBridge({ executeSetZone: vi.fn() })}
        editorStore={store}
        activeZone={ZONES.header}
        isReady={true}
      />,
    );

    expect(screen.getByTestId('zone-toggle-header').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('zone-toggle-main').getAttribute('aria-pressed')).toBe('false');
  });

  it('disables the switcher without throwing when the zone API is absent', () => {
    const store = makeStore();
    setup({ store, bridge: makeBridge({}), activeZone: ZONES.main });

    const headerButton = screen.getByTestId('zone-toggle-header') as HTMLButtonElement;
    expect(headerButton.disabled).toBe(true);
    expect(headerButton.getAttribute('title')).toBe(
      'Zone switching is unavailable in this canvas-editor version',
    );

    expect(() => fireEvent.click(headerButton)).not.toThrow();
    expect(store.setActiveZone).not.toHaveBeenCalled();
  });

  it('disables the switcher when no bridge is mounted yet', () => {
    setup({ store: makeStore(), bridge: null, activeZone: ZONES.main });

    expect((screen.getByTestId('zone-toggle-footer') as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps the switcher disabled while the canvas bridge is not ready', () => {
    const store = makeStore();
    setup({ store, isReady: false, activeZone: ZONES.main });

    const footerButton = screen.getByTestId('zone-toggle-footer') as HTMLButtonElement;
    expect(footerButton.disabled).toBe(true);

    fireEvent.click(footerButton);
    expect(store.setActiveZone).not.toHaveBeenCalled();
  });
});
