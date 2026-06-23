import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { LinkSchema } from './schemas.js';

function resolveRel(
  target: unknown,
  rel: unknown,
): string | undefined {
  if (typeof rel === 'string' && rel.length > 0) {
    return rel;
  }
  if (target === '_blank') {
    return 'noopener noreferrer';
  }
  return undefined;
}

export function LinkRenderer(props: RendererComponentProps<LinkSchema>) {
  const slotProps = props.props;
  const labelContent = resolveRendererSlotContent(props, 'label');
  const hasLabel = hasRendererSlotContent(labelContent);

  const href = typeof slotProps.href === 'string' && slotProps.href.length > 0
    ? slotProps.href
    : undefined;
  const target = slotProps.target as LinkSchema['target'] | undefined;
  const rel = resolveRel(target, slotProps.rel);

  const disabled = slotProps.disabled === true || props.meta.disabled === true;

  const onClick = props.events.onClick;

  // Navigation + action priority (design link §8/§12): the native <a href>
  // performs navigation by default. The bound onClick action runs alongside and
  // only blocks navigation when the action itself calls preventDefault.
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    void onClick?.(event);
  }

  const needsHandler = Boolean(onClick) || disabled;

  return (
    <a
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="link"
      href={disabled ? undefined : href}
      target={target}
      rel={rel}
      onClick={needsHandler ? handleClick : undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        'nop-link',
        disabled && 'nop-link-disabled pointer-events-none opacity-60',
        props.meta.className,
      )}
    >
      {hasLabel ? labelContent : href}
    </a>
  );
}
