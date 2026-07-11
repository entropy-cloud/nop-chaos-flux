import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// happy-dom localStorage persistence is unreliable (no --localstorage-file path);
// install an in-memory store so persistence behavior is testable.
function createMemoryLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

let memoryLs: Storage;

function renderButton(schema: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://button-count-down"
      schema={{ type: 'page', body: [schema] }}
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
    memoryLs = createMemoryLocalStorage();
    vi.stubGlobal('localStorage', memoryLs);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('persists countdown key with pathname when id is set', async () => {
    renderButton({
      type: 'button',
      id: 'verify-btn',
      label: 'Verify',
      testid: 'verify-btn',
      countDown: 5,
      onClick: { action: 'setValue', args: { path: 'sent', value: true } },
    });
    const button = screen.getByTestId('verify-btn') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(button);
      await flushMicrotasks();
    });
    // happy-dom localStorage may not expose key() iteration reliably; read the known key directly.
    const expectedKey = `flux-countdown-${location.pathname}-verify-btn`;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(expectedKey);
    } catch {
      // ignore
    }
    expect(stored).toBeTruthy();
    expect(expectedKey).toContain('verify-btn');
    expect(expectedKey).toContain(location.pathname);
  });

  it('does not persist when neither id nor name is set', async () => {
    renderButton({
      type: 'button',
      label: 'Anon',
      testid: 'anon-btn',
      countDown: 5,
      onClick: { action: 'setValue', args: { path: 'sent', value: true } },
    });
    const button = screen.getByTestId('anon-btn') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(button);
      await flushMicrotasks();
    });
    let found = false;
    try {
      const ls = typeof localStorage !== 'undefined' ? localStorage : null;
      if (ls) {
        for (let i = 0; i < ls.length; i++) {
          if (ls.key(i)?.startsWith('flux-countdown-')) found = true;
        }
      }
    } catch {
      // ignore
    }
    expect(found).toBe(false);
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

    // Drive the self-rescheduling tick past the countdown window. Each 250ms tick
    // recomputes remaining from Date.now() and re-schedules; advancing iteratively
    // within act flushes the React state updates.
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
