import React, { useState } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  cn,
  resolveLucideIconStrict,
} from '@nop-chaos/ui';
import { XIcon, InfoIcon, CheckCircleIcon, TriangleAlertIcon, CircleAlertIcon } from 'lucide-react';
import type { AlertLevel, AlertSchema } from './schemas.js';

const LEVEL_VARIANT_CLASS: Record<AlertLevel, string> = {
  info: 'bg-muted/40 text-foreground border-border',
  success:
    'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800',
  warning:
    'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800',
  error:
    'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-100 dark:border-red-800',
};

function resolveLevel(value: unknown): AlertLevel {
  return value === 'success' || value === 'warning' || value === 'error' ? value : 'info';
}

function LevelIcon({ level, className }: { level: AlertLevel; className?: string }) {
  switch (level) {
    case 'success':
      return <CheckCircleIcon className={className} aria-hidden="true" />;
    case 'warning':
      return <TriangleAlertIcon className={className} aria-hidden="true" />;
    case 'error':
      return <CircleAlertIcon className={className} aria-hidden="true" />;
    case 'info':
    default:
      return <InfoIcon className={className} aria-hidden="true" />;
  }
}

function CustomIconRenderer({ name, className }: { name: string; className?: string }) {
  const IconComp = resolveLucideIconStrict(name);
  if (!IconComp) {
    return null;
  }
  return React.createElement(IconComp, { className, 'aria-hidden': true });
}

export function AlertRenderer(props: RendererComponentProps<AlertSchema>) {
  const slotProps = props.props;
  const level = resolveLevel(slotProps.level);
  const closable = slotProps.closable === true;
  const [open, setOpen] = useState(true);

  const titleContent = resolveRendererSlotContent(props, 'title');
  const hasTitle = hasRendererSlotContent(titleContent);
  const bodyContent = resolveRendererSlotContent(props, 'body');
  const hasBody = hasRendererSlotContent(bodyContent);
  const actionsContent = resolveRendererSlotContent(props, 'actions');
  const hasActions = hasRendererSlotContent(actionsContent);

  const customIconName =
    typeof slotProps.icon === 'string' && slotProps.icon.length > 0 ? slotProps.icon : null;

  if (!open) {
    return null;
  }

  const handleClose = () => {
    setOpen(false);
    void props.events.onClose?.({ type: 'alert:close', level }, { scope: props.node.scope });
  };

  return (
    <Alert
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="alert"
      data-level={level}
      variant={level === 'error' ? 'destructive' : 'default'}
      className={cn(
        'nop-alert',
        level !== 'error' ? LEVEL_VARIANT_CLASS[level] : null,
        props.meta.className,
      )}
    >
      {customIconName ? (
        <CustomIconRenderer name={customIconName} className="size-4" />
      ) : (
        <LevelIcon level={level} className="size-4" />
      )}
      {hasTitle ? <AlertTitle>{titleContent}</AlertTitle> : null}
      {hasBody ? <AlertDescription>{bodyContent}</AlertDescription> : null}
      {hasActions ? (
        <div data-slot="alert-actions" className="mt-2 flex items-center gap-2">
          {actionsContent}
        </div>
      ) : null}
      {closable ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1.5 right-1.5 size-6"
          aria-label="Close"
          data-testid="alert-close"
          onClick={handleClose}
        >
          <XIcon className="size-3.5" />
        </Button>
      ) : null}
    </Alert>
  );
}
