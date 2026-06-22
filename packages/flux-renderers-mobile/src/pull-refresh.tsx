import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
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
      return texts.pullingText ?? '下拉刷新';
    case 'loosing':
      return texts.loosingText ?? '释放刷新';
    case 'loading':
      return texts.loadingText ?? '加载中...';
    case 'success':
      return texts.successText ?? '刷新成功';
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

  const successTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
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
    touchHandlers.onTouchEnd({} as React.TouchEvent);
    if (disabled) return;
    setStatus((current) => {
      if (current === 'loading' || current === 'success') return current;
      if (directionalDelta >= threshold) {
        void Promise.resolve(props.events.onRefresh?.(undefined)).then(() => {
          setStatus('success');
          if (successTimerRef.current) clearTimeout(successTimerRef.current);
          successTimerRef.current = setTimeout(() => {
            setStatus('normal');
          }, successDuration);
        });
        return 'loading';
      }
      return 'normal';
    });
  }, [
    touchHandlers,
    disabled,
    directionalDelta,
    threshold,
    props.events,
    successDuration,
  ]);

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
      onTouchCancel={disabled ? undefined : handleTouchEnd}
    >
      <div
        data-slot="pull-refresh-indicator"
        className="nop-pull-refresh__indicator"
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
        <span className="nop-pull-refresh__text">{indicatorText}</span>
      </div>
      <div data-slot="pull-refresh-body" className="nop-pull-refresh__body">
        {bodyContent}
      </div>
    </div>
  );
}
