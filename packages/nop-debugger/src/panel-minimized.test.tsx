import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { NopDebuggerPanel } from './panel.js';
import { createSnapshot, createController } from './panel.test-support.js';
import type { NopDebuggerSnapshot } from './types.js';

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('NopDebuggerPanel – minimized state', () => {
  it('renders minimized bar with correct size and layout when minimized', () => {
    const snapshot = { ...createSnapshot(), minimized: true };
    const controller = createController(snapshot);

    const { container } = render(<NopDebuggerPanel controller={controller} />);

    const minimizedBar = container.querySelector('.nop-debugger[data-panel-state="minimized"]');
    expect(minimizedBar).toBeTruthy();

    const style = getComputedStyle(minimizedBar!);
    expect(style.display).toBe('flex');
    expect(style.borderRadius).toBe('999px');
    expect(style.cursor).toBe('grab');

    expect(minimizedBar!.querySelector('.ndbg-launcher-icon')).toBeTruthy();
  });

  it('minimized bar has correct CSS layout properties', () => {
    const snapshot = { ...createSnapshot(), minimized: true };
    const controller = createController(snapshot);

    const { container } = render(<NopDebuggerPanel controller={controller} />);

    const minimizedBar = container.querySelector('.nop-debugger[data-panel-state="minimized"]');
    expect(minimizedBar).toBeTruthy();

    const style = getComputedStyle(minimizedBar!);
    expect(style.display).toBe('flex');
    expect(style.borderRadius).toBe('999px');
    expect(style.cursor).toBe('grab');
    expect(style.padding).toBe('8px 14px');
  });

  it('minimized bar shows event count badge', () => {
    const snapshot = {
      ...createSnapshot(),
      minimized: true,
      events: [
        {
          id: 1,
          sessionId: 's',
          timestamp: 1,
          kind: 'render:end' as const,
          group: 'render' as const,
          level: 'info' as const,
          source: 'test',
          summary: 'render',
        },
      ],
    };
    const controller = createController(snapshot);
    render(<NopDebuggerPanel controller={controller} />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(document.querySelector('.ndbg-minimized-badge')).toBeTruthy();
  });

  it('minimized bar shows error badge when errors exist', () => {
    const snapshot = {
      ...createSnapshot(),
      minimized: true,
      events: [
        {
          id: 1,
          sessionId: 's',
          timestamp: 1,
          kind: 'error' as const,
          group: 'error' as const,
          level: 'error' as const,
          source: 'test',
          summary: 'err',
        },
        {
          id: 2,
          sessionId: 's',
          timestamp: 2,
          kind: 'error' as const,
          group: 'error' as const,
          level: 'error' as const,
          source: 'test',
          summary: 'err2',
        },
        {
          id: 3,
          sessionId: 's',
          timestamp: 3,
          kind: 'render:end' as const,
          group: 'render' as const,
          level: 'info' as const,
          source: 'test',
          summary: 'render',
        },
      ],
    };
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByText('2')).toBeTruthy();
    expect(document.querySelector('.ndbg-minimized-error-badge')).toBeTruthy();
    expect(document.querySelector('.ndbg-minimized-badge')).toBeFalsy();
  });

  it('shows full panel after unminimize', () => {
    const listeners = new Set<() => void>();
    let currentSnapshot: NopDebuggerSnapshot = { ...createSnapshot(), minimized: true };
    const controller = createController(currentSnapshot);
    controller.getSnapshot = () => currentSnapshot;
    controller.subscribe = (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    };

    const { rerender } = render(<NopDebuggerPanel controller={controller} />);

    expect(document.querySelector('.nop-debugger[data-panel-state="minimized"]')).toBeTruthy();

    currentSnapshot = { ...currentSnapshot, minimized: false };
    listeners.forEach((l) => l());
    rerender(<NopDebuggerPanel controller={controller} />);

    expect(document.querySelector('.nop-debugger[data-panel-state="minimized"]')).toBeFalsy();
    expect(document.querySelector('.ndbg-drag-handle')).toBeTruthy();
    expect(screen.getByText('Runtime Console')).toBeTruthy();
  });

  // Click-to-restore and drag are verified via E2E (Playwright) — jsdom lacks pointer capture support.
  // Store-level minimize/unminimize state is tested in store.test.ts.
});
