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
  // OA-14: only `'down'` (pull-down-to-refresh) is supported. Pull-up loading
  // belongs to `infinite-scroll` (see design.md §8). The previous `'up'`
  // branch produced geometrically inverted movement on every device.
  const direction = 'down';
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
  // NEW-MM-03: align with swipe-cell's synchronous mirror pattern — every
  // handler that calls setStatus also assigns statusRef.current inline, so
  // rapid successive calls see the latest intent. The passive useEffect
  // mirror below is kept only as a safety net for any future transition path
  // that forgets to write the ref, matching swipe-cell.tsx's pattern.
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

  // OA-14: with `direction` fixed to `'down'`, the pull is simply the positive
  // part of deltaY (finger moving DOWN on screen). The previous sign logic
  // only gated the threshold check for `'up'`, but the body translate stayed
  // positive — which is exactly the inverted-geometry bug. Now there is no
  // sign flip and no `'up'` branch.
  const directionalDelta = Math.max(0, state.deltaY);
  const pullDistance = Math.min(directionalDelta * DAMPING_FACTOR, MAX_PULL_DISTANCE);
  const reachedThreshold = directionalDelta >= threshold;

  // MA-10: derive the displayed status at render time instead of mirroring it
  // through a useEffect+setStatus on every touchmove frame (60-120Hz double
  // render). `status` state now only holds the COMMITTED machine state
  // (normal/loading/success); the transient 'pulling'/'loosing' labels are
  // pure functions of the current touch.
  //
  // The derivation MUST be gated on `state.isTouching`: use-touch.onTouchEnd
  // only clears isTouching, not deltaY/deltaX (those reset on the next
  // touchStart). Without the gate, a release-without-commit would leave a
  // stale 'pulling'/'loosing' label and data-status because the (now stale)
  // directionalDelta is still > 0.
  const isBusy = status === 'loading' || status === 'success';
  const resolvedStatus: PullRefreshStatus = isBusy
    ? status
    : state.isTouching && directionalDelta > 0
      ? reachedThreshold
        ? 'loosing'
        : 'pulling'
      : 'normal';

  const handleTouchEnd = React.useCallback(() => {
    touchHandlers.onTouchEnd();
    if (disabled) return;
    // Re-entrancy guard (previously lived inside the updater, reading `current`).
    const current = statusRef.current;
    if (current === 'loading' || current === 'success') return;

    if (directionalDelta >= threshold) {
      // NEW-MM-03: synchronous statusRef mirror aligned with swipe-cell's
      // pattern — write the ref inline with every setStatus so a rapid second
      // touchEnd in the same tick sees 'loading' and short-circuits (the
      // passive useEffect mirror would only fire after commit).
      statusRef.current = 'loading';
      setStatus('loading');
      // MA-01: a rejected onRefresh must return to 'normal' instead of locking
      // the spinner; MA-12: both branches guard against post-unmount setState.
      // Dispatch lives in the handler body (not in an updater) so React 19
      // StrictMode does not double-invoke it (MA-02).
      void Promise.resolve()
        .then(() => props.events.onRefresh?.({ type: 'refresh', direction, threshold }))
        .then(() => {
          if (!isMountedRef.current) return;
          statusRef.current = 'success';
          setStatus('success');
          if (successTimerRef.current) clearTimeout(successTimerRef.current);
          successTimerRef.current = setTimeout(() => {
            if (!isMountedRef.current) return;
            successTimerRef.current = null;
            statusRef.current = 'normal';
            setStatus('normal');
          }, successDuration);
        })
        .catch(() => {
          if (!isMountedRef.current) return;
          statusRef.current = 'normal';
          setStatus('normal');
        });
      return;
    }

    statusRef.current = 'normal';
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
    // NEW-MM-03: synchronous statusRef mirror (see handleTouchEnd).
    statusRef.current = 'normal';
    setStatus('normal');
  }, [touchHandlers, disabled]);

  const bodyContent = props.regions.body?.render() as React.ReactNode;
  const indicatorText = resolveIndicatorText(resolvedStatus, texts);

  const trackTranslate =
    resolvedStatus === 'loading' || resolvedStatus === 'success'
      ? threshold
      : pullDistance;

  return (
    <div
      className={cn('nop-pull-refresh', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="pull-refresh"
      data-status={resolvedStatus}
      data-direction={direction}
      style={{
        position: 'relative',
        // MA-07: declare vertical gesture ownership so the browser does not
        // compete with native scrolling / overscroll / back-forward during a
        // pull. `pan-x` reserves the VERTICAL axis for this element's JS
        // (touch-action names the axis the BROWSER may pan, so pan-x means the
        // browser pans horizontally and the element receives vertical
        // touchmove — which is what a pull-refresh needs). `overscroll-behavior-
        // y: contain` stops the pull from chaining to a parent scroller.
        // Contract: docs/architecture/mobile-responsive-baseline.md §5.
        touchAction: 'pan-x',
        overscrollBehaviorY: 'contain',
        transform: `translateY(${trackTranslate}px)`,
        transition: state.isTouching ? 'none' : `transform ${animationDuration}ms ease`,
      }}
      onTouchStart={disabled ? undefined : touchHandlers.onTouchStart}
      onTouchMove={disabled ? undefined : touchHandlers.onTouchMove}
      onTouchEnd={disabled ? undefined : handleTouchEnd}
      onTouchCancel={disabled ? undefined : handleTouchCancel}
    >
      {/* OA-09: indicator is out of flow (position:absolute + translateY(-100%))
       * so the body is the only in-flow child of the translated track. The
       * body's screen offset then equals the root translate 1:1 with the
       * finger. The previous in-flow indicator stacked its height on top of
       * the root translate, producing a ~2× overtravel. */}
      <div
        data-slot="pull-refresh-indicator"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: resolvedStatus === 'normal' && pullDistance === 0 ? 0 : trackTranslate,
          transform: 'translateY(-100%)',
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
      <div data-slot="pull-refresh-body">{bodyContent}</div>
    </div>
  );
}
