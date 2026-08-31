import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import { isSafeNavigationUrl } from './sanitize.js';
import type { LinkSchema } from './schemas.js';

function resolveRel(
  target: unknown,
  rel: unknown,
): string | undefined {
  // Trim before judging (15-02): a whitespace-only string would otherwise pass
  // the length check and suppress the target=_blank noopener top-up.
  const trimmedRel = typeof rel === 'string' ? rel.trim() : '';
  if (trimmedRel.length > 0) {
    return trimmedRel;
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

  // [G7-R2-视角11-01] download passthrough: data:/blob: export links are blocked
  // as top-frame navigations by modern browsers unless the anchor carries the
  // `download` attribute. true → download="" (browser-generated filename).
  const rawDownload = slotProps.download;
  const download =
    typeof rawDownload === 'string' && rawDownload.length > 0
      ? rawDownload
      : rawDownload === true
        ? ''
        : undefined;

  // URL protocol guard: a javascript:/data:/vbscript: href would execute on
  // click, and href may be data-bound (`${item.link}`). Unsafe hrefs degrade to
  // a non-navigable link (label still renders) — fail-safe, matching the
  // javascript: URI stripping done by the html/markdown sanitize gate.
  // 15-02: a `blob:` href is safe only when the anchor carries `download`
  // (same-origin object-URL export links, per the schema contract) — without
  // `download` it stays cleared (conservative fail-safe).
  const href =
    typeof slotProps.href === 'string' &&
    slotProps.href.length > 0 &&
    isSafeNavigationUrl(slotProps.href, { download: download !== undefined })
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
      download={download ?? undefined}
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
