import React, { useEffect, useRef, useState } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import {
  Button,
  cn,
  resolveLucideIconStrict,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useIsMobile,
} from '@nop-chaos/ui';
import type { ButtonSchema } from './schemas.js';

const BUTTON_METHODS = ['focus'] as const;

type ButtonVariant = NonNullable<ButtonSchema['variant']>;
type ButtonSize = NonNullable<ButtonSchema['size']>;

const MOBILE_TOUCH_TARGET_SIZES: readonly ButtonSize[] = ['default', 'lg'];

function renderIconSlot(
  icon: React.ComponentType<Record<string, unknown>> | null,
  position: 'inline-start' | 'inline-end',
) {
  if (!icon) {
    return null;
  }
  const IconComp = icon;
  return (
    <IconComp
      data-icon={position}
      size={16}
      strokeWidth={1.8}
      aria-hidden="true"
      focusable="false"
    />
  );
}

/** Storage key for countdown persistence. Includes pathname to avoid cross-page collisions.
 *  Only persists when the author supplied an explicit `id` or `name`; generated node ids
 *  (path keys like `_.body_0_`) are skipped to avoid localStorage garbage. */
function countDownStorageKey(
  id: string | undefined,
  name: string | undefined,
): string | null {
  // A name is always author-supplied (never generated).
  if (name) {
    return `flux-countdown-${typeof location !== 'undefined' ? location.pathname : ''}-${name}`;
  }
  // An explicit author id is a stable string; generated node ids look like `_.body_0_`.
  if (id && !id.startsWith('_')) {
    return `flux-countdown-${typeof location !== 'undefined' ? location.pathname : ''}-${id}`;
  }
  return null;
}

export function ButtonRenderer(props: RendererComponentProps<ButtonSchema>) {
  const label = props.props.label;
  const variant = (props.props.variant ?? 'default') as ButtonVariant;
  const size = (props.props.size ?? 'default') as ButtonSize;
  const isMobile = useIsMobile();

  const disabled = props.props.disabled === true;
  const loading = props.props.loading === true;
  const block = props.props.block === true;
  const active = props.props.active === true;

  const iconComp = resolveLucideIconStrict(props.props.icon);
  const rightIconComp = resolveLucideIconStrict(props.props.rightIcon);

  const tooltip = props.props.tooltip;
  const disabledTip = props.props.disabledTip;
  const tooltipPlacement = props.props.tooltipPlacement;
  const tooltipSide = tooltipPlacement?.side ?? 'top';
  const tooltipAlign = tooltipPlacement?.align ?? 'center';
  const tooltipText = disabled ? (disabledTip ?? tooltip) : tooltip;
  const hasTooltip = Boolean(tooltipText);

  // ── countDown ────────────────────────────────────────────────────────────
  const countDownSeconds = typeof props.props.countDown === 'number' ? props.props.countDown : undefined;
  // Use {timeLeft} token (not ${timeLeft}) so the Flux compiler does not treat it as a
  // scope expression. amis uses a similar `${timeLeft}` token resolved at the i18n layer;
  // Flux resolves it directly in the renderer to stay expression-system-free.
  const countDownTpl = props.props.countDownTpl ?? '{timeLeft}s';
  const countDownKey = countDownStorageKey(props.id, props.props.name);
  // Restore an in-progress countdown from localStorage at first render (survives
  // refresh) when an identity exists. Computed via a lazy initialiser so the
  // restore never needs a synchronous setState-in-effect.
  const [countDownLeft, setCountDownLeft] = useState<number | null>(() => {
    if (countDownSeconds === undefined || !countDownKey) return null;
    try {
      const stored = localStorage.getItem(countDownKey);
      if (!stored) return null;
      const endsAt = Number(stored);
      if (!Number.isFinite(endsAt) || endsAt <= Date.now()) {
        localStorage.removeItem(countDownKey);
        return null;
      }
      const left = Math.ceil((endsAt - Date.now()) / 1000);
      return left > 0 ? left : null;
    } catch {
      // localStorage unavailable (private mode / SSR) — countdown stays session-only.
      return null;
    }
  });
  const countDownEndRef = useRef<number>(0);

  // Sync the restored end-timestamp ref once the restored countdown is known.
  useEffect(() => {
    if (countDownLeft !== null && countDownSeconds !== undefined && countDownKey) {
      try {
        const endsAt = Number(localStorage.getItem(countDownKey));
        if (Number.isFinite(endsAt) && endsAt > Date.now()) {
          countDownEndRef.current = endsAt;
        }
      } catch {
        // ignore
      }
    }
  }, [countDownLeft, countDownSeconds, countDownKey]);

  const countDownInactive = countDownLeft === null || countDownLeft <= 0;

  useEffect(() => {
    if (countDownInactive) {
      return;
    }
    // Drive the tick on a fixed interval regardless of whether the displayed value
    // changes this tick (it may stay the same for several 250ms ticks while the
    // ceiling rounds to the same second). Recompute from the stored end timestamp
    // to avoid drift. Using a recurring interval (not a self-rescheduling timeout)
    // guarantees the countdown keeps progressing even when a tick yields the same
    // remaining second and React bails out of re-rendering.
    const interval = setInterval(() => {
      const remaining = Math.ceil((countDownEndRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        setCountDownLeft(null);
        if (countDownKey) {
          try {
            localStorage.removeItem(countDownKey);
          } catch {
            // ignore
          }
        }
      } else {
        setCountDownLeft(remaining);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [countDownInactive, countDownKey]);

  const countDownActive = countDownLeft !== null && countDownLeft > 0;
  const countDownLabel = countDownActive
    ? countDownTpl.replace(/\{timeLeft\}/g, String(countDownLeft))
    : undefined;

  function startCountDown() {
    if (countDownSeconds === undefined) return;
    const endsAt = Date.now() + countDownSeconds * 1000;
    countDownEndRef.current = endsAt;
    setCountDownLeft(countDownSeconds);
    if (countDownKey) {
      try {
        localStorage.setItem(countDownKey, String(endsAt));
      } catch {
        // ignore quota / private mode
      }
    }
  }

  const leadingSlot = loading ? (
    <Spinner data-icon="inline-start" />
  ) : (
    renderIconSlot(iconComp, 'inline-start')
  );
  const trailingSlot = renderIconSlot(rightIconComp, 'inline-end');

  const mobileTouchTarget = isMobile && MOBILE_TOUCH_TARGET_SIZES.includes(size);
  const buttonClass = cn(
    props.meta.className,
    block && 'w-full',
    mobileTouchTarget && 'min-h-11',
  );

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const anchorRef = useRef<HTMLAnchorElement | null>(null);

  useInputComponentHandle({
    id: props.id,
    type: 'button',
    cid: props.meta.cid,
    methods: BUTTON_METHODS,
    getFocusTarget: () => buttonRef.current ?? anchorRef.current,
    isInteractive: () => !(disabled || loading),
    isVisible: () => props.meta.visible !== false,
  });

  const effectiveDisabled = disabled || loading || countDownActive;
  const displayLabel = countDownActive && countDownLabel ? countDownLabel : label ? String(label) : null;

  const handleClick = async (event: React.MouseEvent) => {
    if (effectiveDisabled) return;
    // Start the countdown only after the onClick action resolves on its success
    // branch (the action runtime rejects on error). This matches the design's
    // "action 成功分支后触发" semantics — a rejecting action does NOT start the
    // countdown, so the user can retry immediately.
    await props.events.onClick?.(event);
    if (countDownSeconds !== undefined) {
      startCountDown();
    }
  };

  const commonProps = {
    className: buttonClass,
    'data-testid': props.meta.testid || undefined,
    'data-cid': props.meta.cid || undefined,
    'data-active': active ? 'true' : undefined,
    'aria-pressed': active ? true : undefined,
    'data-tooltip': hasTooltip ? (tooltipText as string) : undefined,
    'data-countdown': countDownActive ? String(countDownLeft) : undefined,
  };

  const button = props.props.href ? (
    <a
      ref={anchorRef}
      href={props.props.href}
      target={props.props.target}
      {...commonProps}
      onClick={(event) => void handleClick(event)}
    >
      {leadingSlot}
      {displayLabel}
      {trailingSlot}
    </a>
  ) : (
    <Button
      ref={buttonRef}
      variant={variant}
      size={size}
      type="button"
      disabled={effectiveDisabled}
      onClick={(event) => void handleClick(event)}
      {...commonProps}
    >
      {leadingSlot}
      {displayLabel}
      {trailingSlot}
    </Button>
  );

  if (!hasTooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side={tooltipSide} align={tooltipAlign}>
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}
