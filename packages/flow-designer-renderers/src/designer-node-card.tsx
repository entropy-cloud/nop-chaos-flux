import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { Badge, cn } from '@nop-chaos/ui';
import type { DesignerNodeCardSchema } from './schemas.js';
import {
  useDesignerContext,
  useDesignerSnapshotSelector,
  useNodeTypeConfig,
} from './designer-context.js';
import { resolveNodeSummary } from './designer-summary-helpers.js';
import { DesignerIcon } from './designer-icon.js';

export const DESIGNER_NODE_CARD_MARKER = 'nop-designer-node-card';

export interface DesignerNodeCardRendererProps
  extends RendererComponentProps<DesignerNodeCardSchema> {}

export function DesignerNodeCardRenderer(props: DesignerNodeCardRendererProps) {
  const { dispatch } = useDesignerContext();
  const nodeId = props.props.nodeId as string | undefined;

  const summary = useDesignerSnapshotSelector(
    (snapshot) => resolveNodeSummary(snapshot, nodeId),
    (left, right) =>
      left?.id === right?.id &&
      left?.selected === right?.selected &&
      left?.active === right?.active &&
      left?.position.x === right?.position.x &&
      left?.position.y === right?.position.y,
  );

  const typeConfig = useNodeTypeConfig(summary?.type ?? '');
  const typeLabel = typeConfig?.label ?? summary?.type ?? '';

  function handleClick(event: React.MouseEvent) {
    event.stopPropagation();
    if (!summary) {
      return;
    }
    dispatch({ type: 'selectNode', nodeId: summary.id });
  }

  function handleFocus(event: React.MouseEvent) {
    event.stopPropagation();
    if (!summary) {
      return;
    }
    dispatch({ type: 'selectNode', nodeId: summary.id });
  }

  if (!summary) {
    return (
      <div
        className={cn(DESIGNER_NODE_CARD_MARKER, 'nop-designer-node-card--empty', props.meta.className)}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
        data-empty="true"
        data-node-id={nodeId ?? undefined}
        aria-hidden="true"
      />
    );
  }

  const icon = typeConfig?.icon;

  return (
    <button
      type="button"
      className={cn(
        DESIGNER_NODE_CARD_MARKER,
        'nop-designer-summary-card',
        'flex w-full items-start gap-2 rounded-md border border-border/60 bg-card p-2 text-left transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        summary.active && 'nop-designer-node-card--active border-primary/60 ring-1 ring-primary/40',
        summary.selected && !summary.active && 'nop-designer-node-card--selected border-primary/40',
        props.meta.className,
      )}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
      data-node-id={summary.id}
      data-node-type={summary.type}
      data-selected={summary.selected ? 'true' : undefined}
      data-active={summary.active ? 'true' : undefined}
      onClick={handleClick}
      onMouseEnter={handleFocus}
    >
      {icon ? (
        <span className="nop-designer-node-card__icon mt-0.5 inline-flex shrink-0">
          <DesignerIcon icon={icon} size={16} />
        </span>
      ) : null}
      <span className="nop-designer-node-card__info flex min-w-0 flex-1 flex-col gap-1">
        <span className="nop-designer-node-card__title truncate text-sm font-medium text-foreground">
          {typeLabel || summary.id}
        </span>
        <span className="nop-designer-node-card__meta flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
            {summary.type}
          </Badge>
          <span className="nop-designer-node-card__position tabular-nums">
            {t('flux.flowDesigner.nodeCard.position', {
              x: Math.round(summary.position.x),
              y: Math.round(summary.position.y),
            })}
          </span>
        </span>
      </span>
      {summary.active ? (
        <span className="nop-designer-node-card__state text-xs font-medium text-primary">●</span>
      ) : null}
    </button>
  );
}
