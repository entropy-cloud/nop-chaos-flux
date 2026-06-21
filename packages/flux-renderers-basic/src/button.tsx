import React, { useRef } from 'react';
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
} from '@nop-chaos/ui';
import type { ButtonSchema } from './schemas.js';

const BUTTON_METHODS = ['focus'] as const;

type ButtonVariant = NonNullable<ButtonSchema['variant']>;
type ButtonSize = NonNullable<ButtonSchema['size']>;

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

export function ButtonRenderer(props: RendererComponentProps<ButtonSchema>) {
  const label = props.props.label;
  const variant = (props.props.variant ?? 'default') as ButtonVariant;
  const size = (props.props.size ?? 'default') as ButtonSize;

  const disabled = props.props.disabled === true;
  const loading = props.props.loading === true;
  const block = props.props.block === true;
  const active = props.props.active === true;

  const iconComp = resolveLucideIconStrict(props.props.icon);
  const rightIconComp = resolveLucideIconStrict(props.props.rightIcon);

  const tooltip = props.props.tooltip;
  const disabledTip = props.props.disabledTip;
  const tooltipText = disabled ? (disabledTip ?? tooltip) : tooltip;
  const hasTooltip = Boolean(tooltipText);

  const leadingSlot = loading ? (
    <Spinner data-icon="inline-start" />
  ) : (
    renderIconSlot(iconComp, 'inline-start')
  );
  const trailingSlot = renderIconSlot(rightIconComp, 'inline-end');

  const buttonClass = cn(props.meta.className, block && 'w-full');

  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useInputComponentHandle({
    id: props.id,
    type: 'button',
    cid: props.meta.cid,
    methods: BUTTON_METHODS,
    getFocusTarget: () => buttonRef.current,
    isInteractive: () => !(disabled || loading),
    isVisible: () => props.meta.visible !== false,
  });

  const button = (
    <Button
      ref={buttonRef}
      variant={variant}
      size={size}
      className={buttonClass}
      type="button"
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      onClick={(event) => void props.events.onClick?.(event)}
      disabled={disabled || loading}
      data-active={active ? 'true' : undefined}
      aria-pressed={active ? true : undefined}
      data-tooltip={hasTooltip ? (tooltipText as string) : undefined}
    >
      {leadingSlot}
      {label ? String(label) : null}
      {trailingSlot}
    </Button>
  );

  if (!hasTooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
