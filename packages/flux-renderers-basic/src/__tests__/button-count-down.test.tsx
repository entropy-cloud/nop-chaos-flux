import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import type { CountDownStorage } from '../button.js';

// INV-1 audit fix (C1.3): the renderer no longer touches localStorage
// directly. Persistence is host-injected via the optional `countDownStorage`
// adapter (B 档 import-injection pattern, renderer-env.md §9); without an
// adapter the countdown is session-only.

function createMemoryStorage(): CountDownStorage & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    get: (key: string) => (store.has(key) ? store.get(key)! : null),
    set: (key: string, value: string) => {
      store.set(key, value);
    },
    remove: (key: string) => {
      store.delete(key);
    },
  };
}

let memoryStorage: CountDownStorage & { store: Map<string, string> };

function renderButton(schema: Record<string, unknown>) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://button-count-down"
      schema={{ type: 'page', body: [schema as BaseSchema] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('button countDown / countDownTpl (E2e)', () => {
  beforeEach(() => {
    memoryStorage = createMemoryStorage();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('after click + action resolves, button is disabled and shows countdown label', async () => {
    renderButton({
      type: 'button',
      label: 'Send',
      testid: 'send-btn',
      countDown: 3,
      onClick: { action: 'setValue', args: { path: 'sent', value: true } },
    });
    const button = screen.getByTestId('send-btn') as HTMLButtonElement;
    expect(button.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(button);
      await flushMicrotasks();
    });

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('data-countdown')).toBe('3');
    expect(button.textContent).toContain('3');
  });

  it('does not start countdown when clicked if countDown is absent', async () => {
    renderButton({
      type: 'button',
      label: 'Plain',
      testid: 'plain-btn',
      onClick: { action: 'setValue', args: { path: 'x', value: true } },
    });
    const button = screen.getByTestId('plain-btn') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(button);
      await flushMicrotasks();
    });
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('data-countdown')).toBe(false);
  });

  it('persists countdown key with pathname when id is set (via injected adapter)', async () => {
    renderButton({
      type: 'button',
      id: 'verify-btn',
      label: 'Verify',
      testid: 'verify-btn',
      countDown: 5,
      countDownStorage: memoryStorage,
      onClick: { action: 'setValue', args: { path: 'sent', value: true } },
    });
    const button = screen.getByTestId('verify-btn') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(button);
      await flushMicrotasks();
    });

    const expectedKey = `flux-countdown-${location.pathname}-verify-btn`;
    expect(memoryStorage.store.get(expectedKey)).toBeTruthy();
    expect(Number(memoryStorage.store.get(expectedKey))).toBeGreaterThan(Date.now());
  });

  it('does not persist when neither id nor name is set', async () => {
    renderButton({
      type: 'button',
      label: 'Anon',
      testid: 'anon-btn',
      countDown: 5,
      countDownStorage: memoryStorage,
      onClick: { action: 'setValue', args: { path: 'sent', value: true } },
    });
    const button = screen.getByTestId('anon-btn') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(button);
      await flushMicrotasks();
    });
    expect(memoryStorage.store.size).toBe(0);
  });

  it('does not touch storage when no adapter is injected (session-only, INV-1)', async () => {
    renderButton({
      type: 'button',
      id: 'session-btn',
      label: 'Session',
      testid: 'session-btn',
      countDown: 5,
      onClick: { action: 'setValue', args: { path: 'sent', value: true } },
    });
    const button = screen.getByTestId('session-btn') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(button);
      await flushMicrotasks();
    });
    // Countdown still works in-session…
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('data-countdown')).toBe('5');
    // …but nothing was persisted anywhere.
    expect(memoryStorage.store.size).toBe(0);
  });

  it('restores an in-flight countdown from the injected adapter on mount', async () => {
    const future = Date.now() + 30_000;
    memoryStorage.set(`flux-countdown-${location.pathname}-restore-btn`, String(future));

    renderButton({
      type: 'button',
      id: 'restore-btn',
      label: 'Restore',
      testid: 'restore-btn',
      countDown: 60,
      countDownStorage: memoryStorage,
    });
    const button = screen.getByTestId('restore-btn') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    const remaining = Number(button.getAttribute('data-countdown'));
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(60);
  });

  it('removes an expired adapter entry on mount (no restore for stale endsAt)', () => {
    memoryStorage.set(`flux-countdown-${location.pathname}-expired-btn`, String(Date.now() - 1000));

    renderButton({
      type: 'button',
      id: 'expired-btn',
      label: 'Expired',
      testid: 'expired-btn',
      countDown: 60,
      countDownStorage: memoryStorage,
    });
    const button = screen.getByTestId('expired-btn') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(memoryStorage.store.has(`flux-countdown-${location.pathname}-expired-btn`)).toBe(false);
  });

  it('uses countDownTpl to render the label', async () => {
    renderButton({
      type: 'button',
      label: 'Get',
      testid: 'tpl-btn',
      countDown: 4,
      countDownTpl: '重新获取 {timeLeft}',
      onClick: { action: 'setValue', args: { path: 'sent', value: true } },
    });
    const button = screen.getByTestId('tpl-btn') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(button);
      await flushMicrotasks();
    });
    expect(button.textContent).toContain('重新获取 4');
  });

  it('restores enabled + label after countdown elapses', async () => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });
    renderButton({
      type: 'button',
      label: 'Code',
      testid: 'code-btn',
      countDown: 2,
      onClick: { action: 'setValue', args: { path: 'sent', value: true } },
    });
    const button = screen.getByTestId('code-btn') as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(button);
      // Drain microtasks under fake timers (action dispatch chain).
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(button.disabled).toBe(true);

    // Drive the tick past the countdown window. Each 250ms tick recomputes
    // remaining from Date.now() and re-schedules; advancing iteratively within
    // act flushes the React state updates.
    for (let elapsed = 0; elapsed < 4000; elapsed += 250) {
      await act(async () => {
        vi.advanceTimersByTime(250);
      });
    }

    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('data-countdown')).toBe(false);
    expect(button.textContent).toBe('Code');
  });

  it('cleans up timer on unmount (no setState warning)', async () => {
    const { unmount } = renderButton({
      type: 'button',
      label: 'Unmount',
      testid: 'unmount-btn',
      countDown: 10,
      onClick: { action: 'setValue', args: { path: 'sent', value: true } },
    });
    const button = screen.getByTestId('unmount-btn') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(button);
      await flushMicrotasks();
    });
    // Unmount while countdown is active — should not throw.
    expect(() => unmount()).not.toThrow();
  });
});
