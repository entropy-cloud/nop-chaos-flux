import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn, resolveLucideIconStrict } from '@nop-chaos/ui';
import type { NoticeBarSchema, NoticeBarVariant } from './schemas.js';

const VARIANT_ICON_MAP: Record<NoticeBarVariant, string> = {
  info: 'info',
  warning: 'triangle-alert',
  success: 'circle-check',
  error: 'circle-x',
};

// OA-15: dwell time per item for multi-text carousels. Decoupled from the
// marquee animation so that non-overflowing multi-text bars still advance.
// Aligned with design.md §9 ("index + timeout 切换").
const CAROUSEL_INTERVAL_MS = 3000;

const CloseIcon = resolveLucideIconStrict('x');
const DefaultVariantIcons: Record<NoticeBarVariant, ReturnType<typeof resolveLucideIconStrict>> = {
  info: resolveLucideIconStrict(VARIANT_ICON_MAP.info),
  warning: resolveLucideIconStrict(VARIANT_ICON_MAP.warning),
  success: resolveLucideIconStrict(VARIANT_ICON_MAP.success),
  error: resolveLucideIconStrict(VARIANT_ICON_MAP.error),
};

export function NoticeBarRenderer(props: RendererComponentProps<NoticeBarSchema>) {
  const slotProps = props.props;
  const variant: NoticeBarVariant =
    slotProps.variant === 'warning' ||
    slotProps.variant === 'success' ||
    slotProps.variant === 'error' ||
    slotProps.variant === 'info'
      ? slotProps.variant
      : 'info';
  const direction = slotProps.direction === 'right' ? 'right' : 'left';
  const speed = typeof slotProps.speed === 'number' && slotProps.speed > 0 ? slotProps.speed : 50;
  const closable = slotProps.closable === true;
  const loop = slotProps.loop !== false;
  const scrollableConfig = slotProps.scrollable === true;
  const iconName = typeof slotProps.icon === 'string' ? slotProps.icon : undefined;
  const iconComp = resolveLucideIconStrict(iconName) ?? DefaultVariantIcons[variant];

  const textValue = slotProps.text;
  const textList = React.useMemo<string[]>(() => {
    if (Array.isArray(textValue)) {
      return textValue.filter(
        (entry): entry is string => typeof entry === 'string' && entry.length > 0,
      );
    }
    if (typeof textValue === 'string' && textValue.length > 0) {
      return [textValue];
    }
    return [];
  }, [textValue]);

  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const textRef = React.useRef<HTMLSpanElement | null>(null);
  const [shouldScroll, setShouldScroll] = React.useState<boolean>(scrollableConfig);
  const [visible, setVisible] = React.useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);
  const [textWidth, setTextWidth] = React.useState<number>(0);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);

  React.useLayoutEffect(() => {
    if (!scrollableConfig) {
      setShouldScroll(false);
      setTextWidth(0);
      return;
    }
    const contentEl = contentRef.current;
    const textEl = textRef.current;
    if (!contentEl || !textEl) {
      setShouldScroll(false);
      setTextWidth(0);
      return;
    }
    const overflow = textEl.scrollWidth - contentEl.clientWidth;
    setShouldScroll(overflow > 0);
    setTextWidth(textEl.scrollWidth);
  }, [scrollableConfig, textList, currentIndex, containerWidth]);

  // H31: observe the container width so overflow detection re-runs when the
  // host layout changes the available content box (viewport resize, parent
  // flex shrink, orientation change). Without this, a bar that initially fit
  // but later gets a narrower container keeps `shouldScroll=false` and a bar
  // that initially overflowed but later gets more room keeps animating.
  // Symmetric with swipe-cell.tsx:58-83.
  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const contentEl = contentRef.current;
    if (!contentEl) return;
    setContainerWidth(contentEl.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width =
          entry.contentRect?.width ??
          (entry.target as HTMLElement).clientWidth ??
          0;
        setContainerWidth(width);
      }
    });
    ro.observe(contentEl);
    return () => ro.disconnect();
  }, [visible]);

  // animationDuration (one full marquee cycle, in seconds). Computed before the
  // carousel effect so the dwell can reference it. The `+100` buffer keeps a
  // seamless loop handoff (the trailing gap equals one buffer-width); the
  // max/ceil guards against zero/sub-second durations. See design.md §5.
  const animationDuration = shouldScroll
    ? Math.max(1, Math.ceil((textWidth + 100) / speed))
    : 0;

  // OA-19/MM-07: clamp `currentIndex` when the host shrinks `text`. The carousel
  // effect below returns early for `textList.length <= 1`, so without this
  // clamp a rerender from ['a','b','c'] (advanced to idx 2) to ['x'] leaves
  // `currentIndex === 2` and `activeText = textList[2]` undefined -> blank bar.
  React.useEffect(() => {
    setCurrentIndex((idx) => (idx < textList.length ? idx : 0));
  }, [textList.length]);

  // OA-15: drive multi-text carousel via an independent timer, decoupled from
  // overflow detection. Previously `currentIndex` only advanced inside
  // `onAnimationIteration`, which the renderer only attaches when
  // `shouldScroll === true` (scrollWidth > clientWidth) — so a multi-text bar
  // whose content did NOT overflow silently never advanced (dead carousel).
  // The timer re-schedules itself after each advance; `loop: false` halts at
  // the last item. The marquee animation (when overflowing) still plays as a
  // pure visual effect and no longer drives the index change.
  // OA-20: when the current item overflows, its dwell must be at least one full
  // marquee cycle (animationDuration) so the item scrolls fully before
  // advancing — otherwise CAROUSEL_INTERVAL_MS (3000ms) truncates a long
  // marquee at ~25% of its scroll. Non-overflowing items keep the fixed
  // CAROUSEL_INTERVAL_MS dwell (OA-15 preserved).
  const carouselDwellMs = shouldScroll
    ? Math.max(CAROUSEL_INTERVAL_MS, animationDuration * 1000)
    : CAROUSEL_INTERVAL_MS;
  React.useEffect(() => {
    // MM-15: once the bar is closed (visible=false) the component renders null,
    // but this effect still runs (hooks precede the render-time early return at
    // the bottom). Guard here AND keep `visible` in the deps so the cleanup
    // cancels any in-flight carousel setTimeout on close — otherwise it kept
    // firing setCurrentIndex + rescheduling every 3s while hidden.
    if (!visible) return;
    if (textList.length <= 1) return;
    if (!loop && currentIndex >= textList.length - 1) return;
    const id = setTimeout(() => {
      setCurrentIndex((idx) => {
        const next = idx + 1;
        if (loop) return next % textList.length;
        return next >= textList.length ? idx : next;
      });
    }, carouselDwellMs);
    return () => clearTimeout(id);
  }, [textList.length, currentIndex, loop, carouselDwellMs, visible]);

  const handleClose = (event: React.MouseEvent<HTMLButtonElement>) => {
    setVisible(false);
    void props.events.onClose?.(event);
  };

  const hasClick = Boolean(props.events.onClick);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    void props.events.onClick?.(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    void props.events.onClick?.(event);
  };

  if (!visible) {
    return null;
  }

  if (textList.length === 0) {
    return null;
  }

  const activeText = textList[currentIndex] ?? '';
  // OA-22: the keyframe `nop-notice-bar-marquee` travels right-to-left under
  // 'normal'. `direction` inverts vs the intuitive motion — 'left' (default)
  // plays it in reverse so text moves left→right, 'right' plays it normal so
  // text moves right→left. The mapping is locked by test (MM-24) and kept
  // as-is for public-schema stability; see notice-bar/design.md §5.
  const animationDirection = direction === 'left' ? 'reverse' : 'normal';

  // OA-04: a notice bar is advisory, not an alert. Split the semantics by use:
  // when onClick is bound the bar is an operable control (role=button, in tab
  // order, keyboard-activatable); otherwise it is a polite status region that
  // screen readers announce without making it focusable. Mixing role=alert
  // with tabIndex=0 on the same element conflated assertive announcement with
  // operability.
  const interactiveProps = hasClick
    ? { role: 'button' as const, tabIndex: 0 as const, onClick: handleClick, onKeyDown: handleKeyDown }
    : { role: 'status' as const };

  return (
    <div
      {...interactiveProps}
      className={cn(
        'nop-notice-bar flex items-center gap-2 overflow-hidden px-3 py-2',
        props.meta.className,
      )}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="notice-bar"
      data-variant={variant}
      data-scrollable={shouldScroll ? 'true' : 'false'}
    >
      <span data-slot="notice-bar-icon">
        {iconComp ? (() => {
          const IconComp = iconComp;
          return <IconComp className="size-4" aria-hidden="true" />;
        })() : null}
      </span>
      <div
        ref={contentRef}
        data-slot="notice-bar-content"
        className="relative flex-1 overflow-hidden"
      >
        <span
          ref={textRef}
          data-slot="notice-bar-text"
          className="inline-block whitespace-nowrap"
          style={
            shouldScroll
              ? {
                  animationName: 'nop-notice-bar-marquee',
                  animationDuration: `${animationDuration}s`,
                  animationTimingFunction: 'linear',
                  animationIterationCount: loop ? 'infinite' : '1',
                  animationDirection,
                }
              : undefined
          }
        >
          {activeText}
        </span>
      </div>
      {closable ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          data-testid={props.meta.testid ? `${props.meta.testid}-close` : undefined}
          data-slot="notice-bar-close"
          aria-label={t('flux.mobile.noticeBar.close', { defaultValue: '关闭' })}
          onClick={(event) => {
            event.stopPropagation();
            handleClose(event);
          }}
        >
          {CloseIcon ? (() => {
            const Close = CloseIcon;
            return <Close className="size-4" />;
          })() : null}
        </Button>
      ) : null}
    </div>
  );
}
