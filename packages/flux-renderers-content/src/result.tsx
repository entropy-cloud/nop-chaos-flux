import type { RendererComponentProps } from '@nop-chaos/flux-core';
import React from 'react';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { cn, resolveLucideIconStrict } from '@nop-chaos/ui';
import { CheckCircle2Icon, InfoIcon, TriangleAlertIcon, XCircleIcon } from 'lucide-react';
import type { ResultSchema, ResultStatus } from './schemas.js';

const STATUS_ICON_CLASS: Record<ResultStatus, string> = {
  success: 'text-success',
  error: 'text-destructive',
  warning: 'text-warning',
  info: 'text-info',
};

const warnedStatuses = new Set<unknown>();

function resolveStatus(value: unknown): ResultStatus {
  return value === 'success' || value === 'error' || value === 'warning' ? value : 'info';
}

function StatusIcon({ status, className }: { status: ResultStatus; className?: string }) {
  switch (status) {
    case 'success':
      return <CheckCircle2Icon className={className} aria-hidden="true" />;
    case 'error':
      return <XCircleIcon className={className} aria-hidden="true" />;
    case 'warning':
      return <TriangleAlertIcon className={className} aria-hidden="true" />;
    case 'info':
    default:
      return <InfoIcon className={className} aria-hidden="true" />;
  }
}

export function ResultRenderer(props: RendererComponentProps<ResultSchema>) {
  const slotProps = props.props;
  const rawStatus = (slotProps as { status?: unknown }).status;
  const status = rawStatus === undefined ? 'info' : resolveStatus(rawStatus);
  if (rawStatus !== undefined && rawStatus !== status && !warnedStatuses.has(rawStatus)) {
    warnedStatuses.add(rawStatus);
    console.warn(
      `[flux] result: unknown status "${String(rawStatus)}"; rendering with info semantics.`,
    );
  }

  const titleContent = resolveRendererSlotContent(props, 'title');
  const hasTitle = hasRendererSlotContent(titleContent);
  const descriptionContent = resolveRendererSlotContent(props, 'description');
  const hasDescription = hasRendererSlotContent(descriptionContent);
  const actionsContent = resolveRendererSlotContent(props, 'actions');
  const hasActions = hasRendererSlotContent(actionsContent);

  const iconName =
    typeof slotProps.icon === 'string' && slotProps.icon.length > 0 ? slotProps.icon : undefined;
  const CustomIcon = iconName ? resolveLucideIconStrict(iconName) : undefined;

  return (
    <section
      data-slot="result"
      data-status={status}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      className={cn(
        'nop-result flex flex-col items-center justify-center gap-2 px-4 py-10 text-center',
        props.meta.className,
      )}
    >
      <div
        data-slot="result-icon"
        className={cn('flex size-12 items-center justify-center', STATUS_ICON_CLASS[status])}
      >
        {CustomIcon
          ? React.createElement(CustomIcon, { className: 'size-12', 'aria-hidden': true })
          : (
          <StatusIcon status={status} className="size-12" />
          )}
      </div>
      {hasTitle ? (
        <h3 data-slot="result-title" className="text-lg font-semibold">
          {titleContent}
        </h3>
      ) : null}
      {hasDescription ? (
        <div data-slot="result-description" className="max-w-prose text-sm text-muted-foreground">
          {descriptionContent}
        </div>
      ) : null}
      {hasActions ? (
        <div data-slot="result-actions" className="mt-2 flex items-center justify-center gap-2">
          {actionsContent}
        </div>
      ) : null}
    </section>
  );
}
