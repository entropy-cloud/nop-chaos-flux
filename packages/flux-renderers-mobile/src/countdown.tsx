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
      return targetTime - Date.now();
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

  React.useEffect(() => {
    if (!started) return;
    if (paused) return;

    const tick = () => {
      setRemaining((prev) => {
        let next: number;
        if (typeof targetTime === 'number') {
          next = targetTime - Date.now();
        } else if (typeof time === 'number') {
          next = Math.max(0, prev - interval);
        } else {
          next = prev;
        }

        if (next <= 0 && !finishedRef.current) {
          finishedRef.current = true;
          onFinishRef.current();
          return 0;
        }
        return next;
      });
    };

    const timer = setInterval(tick, interval);
    return () => clearInterval(timer);
  }, [started, paused, targetTime, time, interval]);

  const isFinished = remaining <= 0;
  const formatted = formatCountdown(remaining, format);

  return {
    remaining,
    formatted,
    isFinished,
    started,
    reset() {
      setRemaining(computeInitialRemaining());
      finishedRef.current = false;
    },
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
