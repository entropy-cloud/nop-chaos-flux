import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import type { CountdownSchema } from './schemas.js';

const DEFAULT_FORMAT = 'HH:mm:ss';
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = MS_PER_SECOND * 60;
const MS_PER_HOUR = MS_PER_MINUTE * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

export function formatCountdown(remainingMs: number, format: string): string {
  const clamped = Math.max(0, Math.floor(remainingMs));
  const days = Math.floor(clamped / MS_PER_DAY);
  const hours = Math.floor((clamped % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((clamped % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((clamped % MS_PER_MINUTE) / MS_PER_SECOND);
  const milliseconds = clamped % MS_PER_SECOND;

  return format
    .replace(/DD/g, String(days).padStart(2, '0'))
    .replace(/HH/g, String(hours).padStart(2, '0'))
    .replace(/mm/g, String(minutes).padStart(2, '0'))
    .replace(/ss/g, String(seconds).padStart(2, '0'))
    .replace(/SSS/g, String(milliseconds).padStart(3, '0'));
}

interface CountdownTimerOptions {
  time?: number;
  targetTime?: number;
  paused?: boolean;
  autoStart?: boolean;
  millisecond?: boolean;
  format: string;
  onFinish: () => void;
}

interface CountdownTimerResult {
  remaining: number;
  formatted: string;
  isFinished: boolean;
  started: boolean;
  reset: () => void;
  start: () => void;
}

function useCountdownTimer(options: CountdownTimerOptions): CountdownTimerResult {
  const { time, targetTime, paused, autoStart, millisecond, format, onFinish } = options;
  const interval = millisecond ? 30 : 1000;

  const computeInitialRemaining = React.useCallback(() => {
    if (typeof targetTime === 'number') {
      // MA-16: clamp the targetTime branch to 0 so an already-elapsed target
      // does not seed a negative remaining (which would bypass the finish
      // guard and keep ticking with ever-changing negative values).
      return Math.max(0, targetTime - Date.now());
    }
    if (typeof time === 'number') {
      return time;
    }
    return 0;
  }, [targetTime, time]);

  const [remaining, setRemaining] = React.useState<number>(computeInitialRemaining);
  const [started, setStarted] = React.useState<boolean>(autoStart !== false);
  const finishedRef = React.useRef(false);
  const onFinishRef = React.useRef(onFinish);
  React.useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  React.useEffect(() => {
    setRemaining(computeInitialRemaining());
    setStarted(autoStart !== false);
    finishedRef.current = false;
  }, [computeInitialRemaining, autoStart]);

  const isFinished = remaining <= 0;

  // Finish dispatch lives in an EFFECT (not in the setRemaining updater) so
  // React 19 StrictMode does not double-dispatch onFinish (MA-02). The updater
  // stays pure; finishedRef guarantees onFinish fires exactly once per finish.
  React.useEffect(() => {
    if (!isFinished) return;
    if (!started || paused) return;
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinishRef.current();
  }, [isFinished, started, paused]);

  React.useEffect(() => {
    if (!started) return;
    if (paused) return;
    // MA-16: once finished, stop the tick entirely (clearInterval via effect
    // cleanup when isFinished flips). Without this the 30ms millisecond timer
    // would keep firing and, combined with unclamped targetTime math, caused
    // an infinite re-render storm on every finished countdown.
    if (isFinished) return;

    const tick = () => {
      setRemaining((prev) => {
        if (typeof targetTime === 'number') {
          // MA-16: clamp so remaining never goes negative (stabilises at 0,
          // which lets React bail out of further re-renders).
          return Math.max(0, targetTime - Date.now());
        }
        if (typeof time === 'number') {
          return Math.max(0, prev - interval);
        }
        return prev;
      });
    };

    const timer = setInterval(tick, interval);
    return () => clearInterval(timer);
  }, [started, paused, isFinished, targetTime, time, interval]);

  const formatted = formatCountdown(remaining, format);

  return {
    remaining,
    formatted,
    isFinished,
    started,
    // OA-13 reset contract: `remaining` returns to its initial value AND the
    // timer is STOPPED (started=false). A subsequent countdown only begins on
    // an explicit `start()` call. This aligns with `autoStart:false` semantics
    // and avoids the old bug where reset silently restarted because the tick
    // interval was never stopped.
    reset() {
      setRemaining(computeInitialRemaining());
      setStarted(false);
      finishedRef.current = false;
    },
    // start() resumes the timer (after reset() or after autoStart:false).
    start() {
      setStarted(true);
    },
  };
}

export function CountdownRenderer(props: RendererComponentProps<CountdownSchema>) {
  const slotProps = props.props;
  const format = typeof slotProps.format === 'string' && slotProps.format ? slotProps.format : DEFAULT_FORMAT;

  const result = useCountdownTimer({
    time: typeof slotProps.time === 'number' ? slotProps.time : undefined,
    targetTime: typeof slotProps.targetTime === 'number' ? slotProps.targetTime : undefined,
    paused: slotProps.paused === true,
    autoStart: slotProps.autoStart,
    millisecond: slotProps.millisecond === true,
    format,
    onFinish: () => {
      void props.events.onFinish?.(undefined);
    },
  });

  const prefix = typeof slotProps.prefix === 'string' ? slotProps.prefix : '';
  const suffix = typeof slotProps.suffix === 'string' ? slotProps.suffix : '';

  const hasTimeConfig =
    typeof slotProps.time === 'number' || typeof slotProps.targetTime === 'number';

  if (!hasTimeConfig) {
    return (
      <span
        className={cn('nop-countdown', props.meta.className)}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="countdown"
        data-finished="true"
        aria-live="off"
      />
    );
  }

  return (
    <span
      className={cn('nop-countdown', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="countdown"
      data-finished={result.isFinished ? 'true' : 'false'}
      aria-live="off"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {prefix ? <span data-slot="countdown-prefix">{prefix}</span> : null}
      <span data-slot="countdown-value" data-remaining={result.remaining}>
        {result.formatted}
      </span>
      {suffix ? <span data-slot="countdown-suffix">{suffix}</span> : null}
    </span>
  );
}

export { useCountdownTimer };
