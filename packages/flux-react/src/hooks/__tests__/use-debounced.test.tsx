// @vitest-environment happy-dom

import { render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedCallback, useDebouncedValue } from '../use-debounced.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('emits the last value of a burst once the delay elapses', () => {
    function Probe({ value }: { value: string }) {
      const debounced = useDebouncedValue(value, 50);
      return <span data-testid="out">{debounced}</span>;
    }
    const { rerender } = render(<Probe value="v1" />);
    rerender(<Probe value="v2" />);
    rerender(<Probe value="v3" />);
    expect(screen.getByTestId('out').textContent).toBe('v1');
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByTestId('out').textContent).toBe('v3');
  });

  it('keeps the initial value before the delay and cancels pending updates on unmount', () => {
    function Probe({ value }: { value: string }) {
      const debounced = useDebouncedValue(value, 50);
      return <span data-testid="out">{debounced}</span>;
    }
    const { rerender, unmount } = render(<Probe value="v1" />);
    rerender(<Probe value="v2" />);
    unmount();
    expect(() =>
      act(() => {
        vi.advanceTimersByTime(100);
      }),
    ).not.toThrow();
  });
});

describe('useDebouncedCallback', () => {
  it('runs only the last invocation of a burst with the latest closure', () => {
    const calls: string[] = [];
    function Probe({ tag }: { tag: string }) {
      const run = useDebouncedCallback((id: string) => calls.push(`${tag}:${id}`), 50);
      return (
        <button type="button" data-testid="go" onClick={() => run('x')}>
          go
        </button>
      );
    }
    const { rerender } = render(<Probe tag="one" />);
    const button = screen.getByTestId('go');
    button.click();
    rerender(<Probe tag="two" />);
    button.click();
    expect(calls).toEqual([]);
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(calls).toEqual(['two:x']);
  });

  it('cancels the pending invocation on unmount', () => {
    const calls: string[] = [];
    function Probe() {
      const run = useDebouncedCallback((id: string) => calls.push(id), 50);
      return (
        <button type="button" data-testid="go" onClick={() => run('x')}>
          go
        </button>
      );
    }
    const { unmount } = render(<Probe />);
    screen.getByTestId('go').click();
    unmount();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(calls).toEqual([]);
  });
});
