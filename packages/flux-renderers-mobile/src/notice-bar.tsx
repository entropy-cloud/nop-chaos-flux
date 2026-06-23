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
  }, [scrollableConfig, textList, currentIndex]);

  const handleClose = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setVisible(false);
    void props.events.onClose?.(event);
  }, [props.events]);

  const hasClick = Boolean(props.events.onClick);

  const handleClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    void props.events.onClick?.(event);
  }, [props.events]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      void props.events.onClick?.(event);
    },
    [props.events],
  );

  if (!visible) {
    return null;
  }

  if (textList.length === 0) {
    return null;
  }

  const activeText = textList[currentIndex] ?? '';
  const animationDirection = direction === 'left' ? 'reverse' : 'normal';

  const animationDuration = shouldScroll
    ? Math.max(1, Math.ceil((textWidth + 100) / speed))
    : 0;

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
          onAnimationIteration={() => {
            if (loop && textList.length > 1) {
              setCurrentIndex((idx) => (idx + 1) % textList.length);
            }
          }}
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
