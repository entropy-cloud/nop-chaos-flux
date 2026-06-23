// @vitest-environment happy-dom

import { act, cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CountdownSchema } from './schemas.js';
import { CountdownRenderer, formatCountdown, useCountdownTimer } from './countdown.js';
import { createMockRendererProps } from './test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function renderCountdown(
  options: {
    time?: number;
    targetTime?: number;
    format?: string;
    millisecond?: boolean;
    paused?: boolean;
    autoStart?: boolean;
    prefix?: string;
    suffix?: string;
    onFinish?: (event?: unknown) => void;
  } = {},
) {
  const onFinish = vi.fn(options.onFinish ?? (() => undefined));
  const props = createMockRendererProps<CountdownSchema>({
    schema: { type: 'countdown' },
    props: {
      time: options.time,
      targetTime: options.targetTime,
      format: options.format,
      millisecond: options.millisecond,
      paused: options.paused,
      autoStart: options.autoStart,
      prefix: options.prefix,
      suffix: options.suffix,
    },
    events: { onFinish: onFinish as never },
  });
  const view = render(<CountdownRenderer {...props} />);
  return { view, onFinish, props, unmount: view.unmount };
}

describe('formatCountdown', () => {
  it('formats HH:mm:ss for sub-hour duration', () => {
    expect(formatCountdown(2 * 60 * 60 * 1000 + 30 * 60 * 1000 + 45 * 1000, 'HH:mm:ss')).toBe(
      '02:30:45',
    );
  });

  it('formats DD:HH:mm:ss for multi-day duration', () => {
    const ms =
      1 * 24 * 60 * 60 * 1000 +
      2 * 60 * 60 * 1000 +
      30 * 60 * 1000 +
      45 * 1000;
    expect(formatCountdown(ms, 'DD:HH:mm:ss')).toBe('01:02:30:45');
  });

  it('formats mm:ss', () => {
    expect(formatCountdown(30 * 60 * 1000 + 45 * 1000, 'mm:ss')).toBe('30:45');
  });

  it('formats ss only', () => {
    expect(formatCountdown(1845 * 1000, 'ss')).toBe('45');
  });

  it('formats milliseconds with SSS', () => {
    expect(formatCountdown(2 * 60 * 1000 + 45 * 1000 + 123, 'mm:ss:SSS')).toBe('02:45:123');
  });

  it('clamps negative remaining to zero', () => {
    expect(formatCountdown(-500, 'HH:mm:ss')).toBe('00:00:00');
  });

  it('passes through unsupported YYYY/MM tokens literally (OA-11)', () => {
    expect(formatCountdown(0, 'YYYY年MM月')).toBe('YYYY年MM月');
  });
});

describe('CountdownRenderer', () => {
  it('renders formatted value with default HH:mm:ss format', () => {
    const { view } = renderCountdown({ time: 2 * 60 * 60 * 1000 });
    const value = view.container.querySelector('[data-slot="countdown-value"]');
    expect(value?.textContent).toBe('02:00:00');
    expect(view.container.querySelector('[data-finished]')?.getAttribute('data-finished')).toBe(
      'false',
    );
  });

  it('renders prefix and suffix when provided', () => {
    const { view } = renderCountdown({
      time: 90 * 1000,
      prefix: '还剩 ',
      suffix: ' 结束',
      format: 'ss',
    });
    const root = view.container.querySelector('[data-slot="countdown"]') as HTMLElement;
    expect(root.querySelector('[data-slot="countdown-prefix"]')?.textContent).toBe('还剩 ');
    expect(root.querySelector('[data-slot="countdown-value"]')?.textContent).toBe('30');
    expect(root.querySelector('[data-slot="countdown-suffix"]')?.textContent).toBe(' 结束');
  });

  it('renders empty when neither time nor targetTime provided', () => {
    const { view } = renderCountdown({});
    const root = view.container.querySelector('[data-slot="countdown"]') as HTMLElement;
    expect(root.getAttribute('data-finished')).toBe('true');
    expect(root.querySelector('[data-slot="countdown-value"]')).toBeNull();
  });

  it('renders zero value and fires onFinish when time elapses to zero', () => {
    vi.useFakeTimers();
    const onFinish = vi.fn();
    const { view } = renderCountdown({ time: 1000, format: 'ss', onFinish });
    expect(view.container.querySelector('[data-slot="countdown-value"]')?.textContent).toBe('01');

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(view.container.querySelector('[data-finished]')?.getAttribute('data-finished')).toBe(
      'true',
    );
    expect(view.container.querySelector('[data-slot="countdown-value"]')?.textContent).toBe('00');
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('does not advance while paused', () => {
    vi.useFakeTimers();
    const { view } = renderCountdown({ time: 5 * 1000, format: 'ss', paused: true });
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(view.container.querySelector('[data-slot="countdown-value"]')?.textContent).toBe('05');
  });

  it('does not start countdown when autoStart:false', () => {
    vi.useFakeTimers();
    const { view } = renderCountdown({ time: 5 * 1000, format: 'ss', autoStart: false });
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(view.container.querySelector('[data-slot="countdown-value"]')?.textContent).toBe('05');
  });

  it('fires onFinish exactly once when countdown hits zero', async () => {
    vi.useFakeTimers();
    const onFinish = vi.fn();
    renderCountdown({ time: 1000, format: 'ss', onFinish });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('cleans up timer on unmount', () => {
    vi.useFakeTimers();
    const onFinish = vi.fn();
    const { unmount } = renderCountdown({ time: 1000, format: 'ss', onFinish });
    unmount();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('uses targetTime when both time and targetTime are provided', async () => {
    const targetTime = Date.now() + 90 * 1000;
    const { view } = renderCountdown({
      time: 5 * 1000,
      targetTime,
      format: 'ss',
    });
    const value = view.container.querySelector('[data-slot="countdown-value"]')?.textContent ?? '0';
    // 90 seconds -> ss format shows the seconds part (00..59), but it's > 5
    expect(Number(value)).toBeGreaterThanOrEqual(0);
    expect(Number(value)).toBeLessThanOrEqual(59);
  });

  it('formats the targetTime seconds part exactly (MA-15 strict)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    try {
      const { view } = renderCountdown({ targetTime: 90_000, format: 'ss' });
      // remaining = 90000 → ss = floor(90000/1000) % 60 = 30
      expect(view.container.querySelector('[data-slot="countdown-value"]')?.textContent).toBe('30');
    } finally {
      vi.useRealTimers();
    }
  });

  it('ticks at the 30ms granularity in millisecond mode (MA-15)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    try {
      const { view } = renderCountdown({
        time: 120,
        millisecond: true,
        format: 'ss:SSS',
      });
      expect(view.container.querySelector('[data-slot="countdown-value"]')?.textContent).toBe(
        '00:120',
      );
      act(() => {
        vi.advanceTimersByTime(30);
      });
      expect(view.container.querySelector('[data-slot="countdown-value"]')?.textContent).toBe(
        '00:090',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('clamps an elapsed targetTime to zero and fires onFinish once (MA-16)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    try {
      const onFinish = vi.fn();
      const { view } = renderCountdown({
        targetTime: 5_000,
        format: 'ss',
        onFinish,
      });
      expect(view.container.querySelector('[data-finished]')?.getAttribute('data-finished')).toBe(
        'true',
      );
      expect(view.container.querySelector('[data-slot="countdown-value"]')?.textContent).toBe('00');
      expect(onFinish).toHaveBeenCalledTimes(1);

      // Advancing well past the elapsed target must not re-dispatch or change state.
      act(() => {
        vi.advanceTimersByTime(5_000);
      });
      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(view.container.querySelector('[data-slot="countdown-value"]')?.textContent).toBe('00');
    } finally {
      vi.useRealTimers();
    }
  });

  it('dispatches onFinish with a structured {type:"finish"} payload (MA-04)', () => {
    vi.useFakeTimers();
    const onFinish = vi.fn();
    try {
      renderCountdown({ time: 1000, format: 'ss', onFinish });
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(onFinish.mock.calls[0][0]).toEqual({ type: 'finish' });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('useCountdownTimer', () => {
  interface HarnessHandle {
    reset: () => void;
    start: () => void;
  }

  interface HarnessProps {
    time?: number;
    targetTime?: number;
    format?: string;
    millisecond?: boolean;
    paused?: boolean;
    autoStart?: boolean;
    onFinish?: () => void;
    onHandle?: (handle: HarnessHandle) => void;
    onCommit?: () => void;
  }

  function CountdownTimerHarness(props: HarnessProps) {
    const result = useCountdownTimer({
      time: props.time,
      targetTime: props.targetTime,
      format: props.format ?? 'ss',
      millisecond: props.millisecond,
      paused: props.paused,
      autoStart: props.autoStart,
      onFinish: props.onFinish ?? (() => undefined),
    });
    React.useEffect(() => {
      props.onCommit?.();
    });
    React.useEffect(() => {
      props.onHandle?.({ reset: result.reset, start: result.start });
    });
    return (
      <span
        data-testid="harness"
        data-remaining={result.remaining}
        data-started={String(result.started)}
        data-finished={result.isFinished ? 'true' : 'false'}
      >
        {result.formatted}
      </span>
    );
  }

  it('reset() stops the timer; start() resumes it (OA-13)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    try {
      let handle: HarnessHandle | null = null;
      const view = render(
        <CountdownTimerHarness
          time={5_000}
          format="ss"
          onHandle={(h) => {
            handle = h;
          }}
        />,
      );
      const harness = () => view.container.querySelector('[data-testid="harness"]') as HTMLElement;

      // autoStart default → started=true, remaining=5000 → '05'
      expect(harness().getAttribute('data-started')).toBe('true');
      expect(harness().textContent).toBe('05');

      act(() => handle?.reset());
      // OA-13: started=false (stopped), remaining returns to initial, no auto-resume.
      expect(harness().getAttribute('data-started')).toBe('false');
      expect(harness().textContent).toBe('05');
      act(() => {
        vi.advanceTimersByTime(2_000);
      });
      // timer is stopped → display does not advance
      expect(harness().textContent).toBe('05');

      act(() => handle?.start());
      expect(harness().getAttribute('data-started')).toBe('true');
      act(() => {
        vi.advanceTimersByTime(1_000);
      });
      expect(harness().textContent).toBe('04');
    } finally {
      vi.useRealTimers();
    }
  });

  it('autoStart runtime toggle does not reset remaining/finishedRef (MM-08)', () => {
    // MM-08: `autoStart` is a mount-time option (schemas.ts:87,
    // countdown/design.md:54). A runtime toggle must only recompute `started`,
    // not reset `remaining` to the initial value nor clear `finishedRef`. The
    // pre-fix combined effect coupled an `autoStart`-only change to
    // setRemaining(computeInitialRemaining()), wiping elapsed progress.
    vi.useFakeTimers();
    vi.setSystemTime(0);
    try {
      const view = render(<CountdownTimerHarness time={5_000} format="ss" autoStart />);
      const harness = () =>
        view.container.querySelector('[data-testid="harness"]') as HTMLElement;
      expect(harness().getAttribute('data-started')).toBe('true');
      expect(harness().textContent).toBe('05');

      // tick 2s -> remaining 3000 -> '03'
      act(() => {
        vi.advanceTimersByTime(2_000);
      });
      expect(harness().textContent).toBe('03');

      // rerender with autoStart:false (runtime toggle of a mount-time option).
      // Only `started` should change; remaining must NOT reset to 5000 ('05').
      view.rerender(<CountdownTimerHarness time={5_000} format="ss" autoStart={false} />);
      expect(harness().getAttribute('data-started')).toBe('false');
      expect(harness().textContent).toBe('03');

      // rerender back to autoStart:true; remaining still preserved.
      view.rerender(<CountdownTimerHarness time={5_000} format="ss" autoStart />);
      expect(harness().getAttribute('data-started')).toBe('true');
      expect(harness().textContent).toBe('03');
    } finally {
      vi.useRealTimers();
    }
  });

  it('preserves the displayed value across a targetTime pause window (MM-14)', () => {
    // MM-14: in targetTime mode, pausing cleared the interval but Date.now()
    // kept advancing; on resume the first tick recomputed targetTime - Date.now()
    // and swallowed the whole pause window (e.g. 60s display → ~40s). The fix
    // re-anchors the run-segment on resume so the pause window is excluded.
    vi.useFakeTimers();
    vi.setSystemTime(0);
    try {
      const view = render(<CountdownTimerHarness targetTime={60_000} format="ss" />);
      const harness = () => view.container.querySelector('[data-testid="harness"]') as HTMLElement;
      expect(Number(harness().getAttribute('data-remaining'))).toBe(60_000);

      // run 10s → remaining 50_000
      act(() => {
        vi.advanceTimersByTime(10_000);
      });
      expect(Number(harness().getAttribute('data-remaining'))).toBe(50_000);

      // pause; wall-clock advances 10s during the pause
      view.rerender(<CountdownTimerHarness targetTime={60_000} format="ss" paused />);
      act(() => {
        vi.advanceTimersByTime(10_000);
      });
      // Paused → display frozen at the paused value (50_000), not advanced.
      expect(Number(harness().getAttribute('data-remaining'))).toBe(50_000);

      // resume → the run-segment is re-anchored; the pause window is excluded.
      view.rerender(<CountdownTimerHarness targetTime={60_000} format="ss" />);
      act(() => {
        vi.advanceTimersByTime(1_000);
      });
      const remaining = Number(harness().getAttribute('data-remaining'));
      // Fix: continues from 50_000 → ~49_000 after one resumed tick.
      // Pre-fix: recomputed targetTime - Date.now() = 60000 - 21000 = 39_000.
      expect(remaining).toBeGreaterThanOrEqual(48_000);
      expect(remaining).toBeLessThanOrEqual(50_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('time mode stays wall-clock accurate under a throttled setInterval (OA-21)', () => {
    // OA-21: the `time` branch tick was purely subtractive (prev - interval),
    // which is only correct if setInterval fires exactly every `interval` ms.
    // Real browsers throttle background setInterval; this test simulates a
    // background-tab throttle where 30s of wall-clock elapse but only ONE 1000ms
    // tick is delivered. Date.now is decoupled from the faked setInterval queue.
    vi.useFakeTimers();
    let wallClock = 0;
    const dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => wallClock);
    try {
      const view = render(<CountdownTimerHarness time={60_000} format="ss" />);
      const harness = () => view.container.querySelector('[data-testid="harness"]') as HTMLElement;
      expect(Number(harness().getAttribute('data-remaining'))).toBe(60_000);

      // 30s of wall-clock elapse, but only ONE interval tick is delivered.
      wallClock = 30_000;
      act(() => {
        vi.advanceTimersByTime(1_000);
      });

      const remaining = Number(harness().getAttribute('data-remaining'));
      // Wall-clock accurate: ~30_000 remaining. Pre-fix subtractive tick
      // (prev - interval) yields 59_000 — pure drift invisible to ideal-timer tests.
      expect(remaining).toBeGreaterThanOrEqual(29_000);
      expect(remaining).toBeLessThanOrEqual(30_000);
    } finally {
      dateSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('does not keep re-rendering after finish in millisecond mode (targetTime branch, MA-16)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    try {
      let commits = 0;
      const onFinish = vi.fn();
      render(
        <CountdownTimerHarness
          targetTime={30}
          millisecond
          format="ss:SSS"
          onFinish={onFinish}
          onCommit={() => {
            commits += 1;
          }}
        />,
      );
      // tick at 30ms: remaining 30 → clamped 0 → finish
      act(() => {
        vi.advanceTimersByTime(60);
      });
      expect(onFinish).toHaveBeenCalledTimes(1);
      const commitsAtFinish = commits;

      // Original MA-16 defect: targetTime - Date.now() stays negative AND keeps
      // changing every tick → a re-render storm every 30ms. The fix clamps the
      // targetTime branch AND clears the interval on finish, so the commit
      // count must remain stable here.
      act(() => {
        vi.advanceTimersByTime(1_000);
      });
      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(commits).toBe(commitsAtFinish);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fires onFinish exactly once when time reaches zero under StrictMode (MM-23)', () => {
    // MM-23: countdown had no StrictMode coverage (unlike pull-refresh/swipe-cell).
    // This is coverage hardening for MA-02's effect-based dispatch + finishedRef:
    // React 19 StrictMode double-invokes effects only on the initial mount, so
    // when isFinished flips on a later commit the finish effect runs once and
    // finishedRef guarantees a single onFinish dispatch.
    vi.useFakeTimers();
    const onFinish = vi.fn();
    try {
      render(
        <React.StrictMode>
          <CountdownTimerHarness time={1_000} format="ss" onFinish={onFinish} />
        </React.StrictMode>,
      );
      act(() => {
        vi.advanceTimersByTime(1_100);
      });
      expect(onFinish).toHaveBeenCalledTimes(1);
      // A subsequent tick window must not re-dispatch.
      act(() => {
        vi.advanceTimersByTime(2_000);
      });
      expect(onFinish).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
