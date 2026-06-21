import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { Button, cn, resolveLucideIconStrict, toast } from '@nop-chaos/ui';
import type { TextSchema } from './schemas.js';
import { copyToClipboard } from './copy-to-clipboard.js';

const VALID_TAGS = [
  'span',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'label',
  'div',
] as const;

function resolveMaxLineClass(maxLine: unknown): string | null {
  if (typeof maxLine !== 'number' || !Number.isFinite(maxLine) || maxLine <= 0) {
    return null;
  }
  const clamped = Math.floor(maxLine);
  if (clamped > 100) {
    return 'line-clamp-100';
  }
  return `line-clamp-${clamped}`;
}

const CopyIcon = resolveLucideIconStrict('copy');
const CheckIcon = resolveLucideIconStrict('check');

function TextCopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const onClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const result = await copyToClipboard(value);
    if (result.success) {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
      toast.success('Copied');
    } else {
      toast.error('Copy failed');
    }
  };

  const IconComp = (copied ? CheckIcon : CopyIcon) as React.ComponentType<{
    className?: string;
  }>;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      data-slot="text-copy-button"
      className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-primary"
      onClick={onClick}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
    >
      {IconComp ? <IconComp className="size-3" /> : null}
    </Button>
  );
}

export function TextRenderer(props: RendererComponentProps<TextSchema>) {
  const text = props.props.body ?? props.props.text;
  const resolvedText = String(text ?? '');
  const tag = VALID_TAGS.includes(props.props.tag as (typeof VALID_TAGS)[number])
    ? (props.props.tag as (typeof VALID_TAGS)[number])
    : 'span';
  const Tag: keyof React.JSX.IntrinsicElements = tag;
  const copyable = props.props.copyable === true;
  const maxLineClass = resolveMaxLineClass(props.props.maxLine);

  return (
    <Tag
      className={cn('nop-text', maxLineClass, props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      {resolvedText}
      {copyable ? <TextCopyButton value={resolvedText} /> : null}
    </Tag>
  );
}
