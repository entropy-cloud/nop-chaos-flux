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

export interface CountdownTimerOptions {
  time?: number;
  targetTime?: number;
  paused?: boolean;
  autoStart?: boolean;
  millisecond?: boolean;
  format: string;
  onFinish: () => void;
}

export interface CountdownTimerResult {
  remaining: number;
  formatted: string;
  isFinished: boolean;
  started: boolean;
  reset: () => void;
  start: () => void;
}

export function useCountdownTimer(options: CountdownTimerOptions): CountdownTimerResult {
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

  // MM-14/OA-21: wall-clock derivation. `remainingRef` always mirrors the
  // latest committed remaining (synced at every setRemaining site). When a run
  // segment (re)starts, `startTimestampRef` captures Date.now() and
  // `remainingAtStartRef` captures the remaining to count down from. Each tick
  // then derives `remaining = max(0, remainingAtStart - (Date.now() - start))`,
  // so BOTH the targetTime and time branches are drift-proof under a throttled
  // setInterval (OA-21) and resume continues from the paused value instead of
  // recomputing targetTime - Date.now() and swallowing the pause window (MM-14).
  const remainingRef = React.useRef<number>(computeInitialRemaining());
  const startTimestampRef = React.useRef<number>(0);
  const remainingAtStartRef = React.useRef<number>(computeInitialRemaining());

  // MM-08: split the reset lifecycle. `autoStart` is a mount-time option
  // (schemas.ts:87, countdown/design.md:54) — a runtime toggle must only
  // recompute `started`, not reset `remaining`/`finishedRef`. The previous
  // single effect coupled an `autoStart`-only change to
  // setRemaining(computeInitialRemaining()), wiping elapsed progress on every
  // toggle. The two effects below keep the `time`/`targetTime` reset path
  // (remaining + finishedRef) separate from the `autoStart`-only `started`
  // recompute.
  React.useEffect(() => {
    const initial = computeInitialRemaining();
    setRemaining(initial);
    // MM-14/OA-21: re-anchor the wall-clock origin on a config change so the
    // tick effect (which reads these refs in declaration order after this
    // effect) counts down from the new initial using fresh wall-clock elapsed.
    remainingRef.current = initial;
    remainingAtStartRef.current = initial;
    startTimestampRef.current = Date.now();
    finishedRef.current = false;
  }, [computeInitialRemaining]);

  React.useEffect(() => {
    setStarted(autoStart !== false);
  }, [autoStart]);

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

    // MM-14/OA-21: anchor this run-segment's wall-clock origin. `remainingRef`
    // holds the latest committed remaining — frozen across pause/stop, or reset
    // to the initial value by the config-change effect above (which runs before
    // this effect in declaration order). Anchoring here makes resume continue
    // from the paused value (MM-14) instead of recomputing targetTime - now,
    // and makes every tick wall-clock-derived (OA-21) so a throttled setInterval
    // can no longer drift the display. This unifies the targetTime and time
    // branches: targetTime seeded initialRemaining as targetTime - mountNow, so
    // remainingAtStart - elapsed == targetTime - Date.now() (algebraically
    // equivalent to the previous targetTime branch, but pause-safe).
    startTimestampRef.current = Date.now();
    remainingAtStartRef.current = remainingRef.current;

    const tick = () => {
      const elapsed = Date.now() - startTimestampRef.current;
      // MA-16: clamp so remaining never goes negative (stabilises at 0, which
      // lets isFinished flip and the effect cleanup stop the interval).
      const next = Math.max(0, remainingAtStartRef.current - elapsed);
      remainingRef.current = next;
      setRemaining(next);
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
      const initial = computeInitialRemaining();
      setRemaining(initial);
      remainingRef.current = initial;
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
      void props.events.onFinish?.({ type: 'finish' });
    },
  });

  const prefix = typeof slotProps.prefix === 'string' ? slotProps.prefix : '';
  const suffix = typeof slotProps.suffix === 'string' ? slotProps.suffix : '';

  const hasTimeConfig =
    typeof slotProps.time === 'number' || typeof slotProps.targetTime === 'number';

  if (!hasTimeConfig) {
    return (
      <span
        className={cn('nop-countdown tabular-nums', props.meta.className)}
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
      className={cn('nop-countdown tabular-nums', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="countdown"
      data-finished={result.isFinished ? 'true' : 'false'}
      aria-live="off"
    >
      {prefix ? <span data-slot="countdown-prefix">{prefix}</span> : null}
      <span data-slot="countdown-value" data-remaining={result.remaining}>
        {result.formatted}
      </span>
      {suffix ? <span data-slot="countdown-suffix">{suffix}</span> : null}
    </span>
  );
}
