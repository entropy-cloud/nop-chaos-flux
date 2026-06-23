import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { Spinner, cn } from '@nop-chaos/ui';
import type { PullRefreshSchema } from './schemas.js';
import { useTouch } from './hooks/use-touch.js';

type PullRefreshStatus = 'normal' | 'pulling' | 'loosing' | 'loading' | 'success';

const DAMPING_FACTOR = 0.5;
const MAX_PULL_DISTANCE = 200;

function resolveIndicatorText(
  status: PullRefreshStatus,
  texts: {
    pullingText?: string;
    loosingText?: string;
    loadingText?: string;
    successText?: string;
  },
): string {
  switch (status) {
    case 'pulling':
      return texts.pullingText ?? t('flux.mobile.pullRefresh.pulling', { defaultValue: '下拉刷新' });
    case 'loosing':
      return texts.loosingText ?? t('flux.mobile.pullRefresh.loosing', { defaultValue: '释放刷新' });
    case 'loading':
      return texts.loadingText ?? t('flux.mobile.pullRefresh.loading', { defaultValue: '加载中...' });
    case 'success':
      return texts.successText ?? t('flux.mobile.pullRefresh.success', { defaultValue: '刷新成功' });
    default:
      return '';
  }
}

export function PullRefreshRenderer(props: RendererComponentProps<PullRefreshSchema>) {
  const slotProps = props.props;
  const direction = slotProps.direction === 'up' ? 'up' : 'down';
  const threshold = typeof slotProps.threshold === 'number' ? slotProps.threshold : 60;
  const disabled = slotProps.disabled === true;
  const animationDuration =
    typeof slotProps.animationDuration === 'number' ? slotProps.animationDuration : 300;
  const successDuration = typeof slotProps.successDuration === 'number' ? slotProps.successDuration : 500;

  const texts = {
    pullingText: slotProps.pullingText,
    loosingText: slotProps.loosingText,
    loadingText: slotProps.loadingText,
    successText: slotProps.successText,
  };

  const { state, touchHandlers } = useTouch({ threshold: 10 });
  const [status, setStatus] = React.useState<PullRefreshStatus>('normal');

  // statusRef mirrors the committed status so event handlers can read the
  // current value synchronously. This is required because the onRefresh
  // dispatch was moved OUT of the setStatus updater (MA-02): previously the
  // updater read `current` to guard re-entrancy, but updaters must stay pure.
  const statusRef = React.useRef<PullRefreshStatus>('normal');
  React.useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const successTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Unmount guard for the in-flight refresh promise and the success timer.
  // Without this, resolving the promise after unmount schedules a timer that
  // is never cleared (the cleanup only inspects successTimerRef at unmount).
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    };
  }, []);

  const sign = direction === 'down' ? 1 : -1;
  const rawOffset = state.deltaY * sign;
  const directionalDelta = Math.max(0, rawOffset);
  const pullDistance = Math.min(directionalDelta * DAMPING_FACTOR, MAX_PULL_DISTANCE);
  const reachedThreshold = directionalDelta >= threshold;

  React.useEffect(() => {
    if (disabled) return;
    if (!state.isTouching) return;
    if (status === 'loading' || status === 'success') return;

    if (directionalDelta > 0) {
      setStatus(reachedThreshold ? 'loosing' : 'pulling');
    }
  }, [state.isTouching, directionalDelta, reachedThreshold, disabled, status]);

  const handleTouchEnd = React.useCallback(() => {
    touchHandlers.onTouchEnd();
    if (disabled) return;
    // Re-entrancy guard (previously lived inside the updater, reading `current`).
    const current = statusRef.current;
    if (current === 'loading' || current === 'success') return;

    if (directionalDelta >= threshold) {
      setStatus('loading');
      // MA-01: a rejected onRefresh must return to 'normal' instead of locking
      // the spinner; MA-12: both branches guard against post-unmount setState.
      // Dispatch lives in the handler body (not in an updater) so React 19
      // StrictMode does not double-invoke it (MA-02).
      void Promise.resolve()
        .then(() => props.events.onRefresh?.({ type: 'refresh', direction, threshold }))
        .then(() => {
          if (!isMountedRef.current) return;
          setStatus('success');
          if (successTimerRef.current) clearTimeout(successTimerRef.current);
          successTimerRef.current = setTimeout(() => {
            if (!isMountedRef.current) return;
            successTimerRef.current = null;
            setStatus('normal');
          }, successDuration);
        })
        .catch(() => {
          if (!isMountedRef.current) return;
          setStatus('normal');
        });
      return;
    }

    setStatus('normal');
  }, [
    touchHandlers,
    disabled,
    directionalDelta,
    direction,
    threshold,
    props.events,
    successDuration,
  ]);

  // OA-05: a system touchcancel (multi-touch, scroll takeover, incoming call,
  // gesture interruption) is NOT a user lift — it must not commit the pull or
  // dispatch onRefresh. Restore to the resting state and let the body rebound.
  const handleTouchCancel = React.useCallback(() => {
    touchHandlers.onTouchEnd();
    if (disabled) return;
    const current = statusRef.current;
    if (current === 'loading' || current === 'success') return;
    setStatus('normal');
  }, [touchHandlers, disabled]);

  const bodyContent = props.regions.body?.render() as React.ReactNode;
  const isBusy = status === 'loading' || status === 'success';
  const indicatorText = resolveIndicatorText(status, texts);

  const trackTranslate =
    status === 'loading'
      ? threshold
      : status === 'success'
        ? threshold
        : pullDistance;

  return (
    <div
      className={cn('nop-pull-refresh', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="pull-refresh"
      data-status={status}
      data-direction={direction}
      style={{
        transform: `translateY(${trackTranslate}px)`,
        transition: state.isTouching ? 'none' : `transform ${animationDuration}ms ease`,
      }}
      onTouchStart={disabled ? undefined : touchHandlers.onTouchStart}
      onTouchMove={disabled ? undefined : touchHandlers.onTouchMove}
      onTouchEnd={disabled ? undefined : handleTouchEnd}
      onTouchCancel={disabled ? undefined : handleTouchCancel}
    >
      <div
        data-slot="pull-refresh-indicator"
        style={{
          height: status === 'normal' && pullDistance === 0 ? 0 : trackTranslate,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-live="polite"
        data-indicator-text={indicatorText || undefined}
      >
        {isBusy ? <Spinner className="size-4" /> : null}
        <span>{indicatorText}</span>
      </div>
      <div data-slot="pull-refresh-body">
        {bodyContent}
      </div>
    </div>
  );
}
