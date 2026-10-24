import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { Badge, cn } from '@nop-chaos/ui';
import type { DesignerEdgeRowSchema } from './schemas.js';
import {
  useDesignerContext,
  useDesignerSnapshotSelector,
  useEdgeTypeConfig,
  useNodeTypeConfig,
} from './designer-context.js';
import { resolveEdgeSummary } from './designer-summary-helpers.js';

export const DESIGNER_EDGE_ROW_MARKER = 'nop-designer-edge-row';

export interface DesignerEdgeRowRendererProps
  extends RendererComponentProps<DesignerEdgeRowSchema> {}

function useNodeLabel(nodeId: string | undefined): string {
  const nodeType = useDesignerSnapshotSelector((snapshot) => {
    if (!nodeId) {
      return undefined;
    }
    const node = snapshot.doc.nodes.find((entry) => entry.id === nodeId);
    return node?.type;
  });
  const typeConfig = useNodeTypeConfig(nodeType ?? '');
  return typeConfig?.label ?? nodeId ?? '';
}

export function DesignerEdgeRowRenderer(props: DesignerEdgeRowRendererProps) {
  const { dispatch } = useDesignerContext();
  const edgeId = props.props.edgeId as string | undefined;

  const summary = useDesignerSnapshotSelector(
    (snapshot) => resolveEdgeSummary(snapshot, edgeId),
    (left, right) =>
      left?.id === right?.id &&
      left?.selected === right?.selected &&
      left?.active === right?.active &&
      left?.source === right?.source &&
      left?.target === right?.target,
  );

  const edgeTypeConfig = useEdgeTypeConfig(summary?.type ?? '');
  const edgeTypeLabel = edgeTypeConfig?.label ?? summary?.type ?? '';

  const sourceLabel = useNodeLabel(summary?.source);
  const targetLabel = useNodeLabel(summary?.target);

  function handleClick(event: React.MouseEvent) {
    event.stopPropagation();
    if (!summary) {
      return;
    }
    dispatch({ type: 'selectEdge', edgeId: summary.id });
  }

  if (!summary) {
    // plan 544 seed 3 (V6): visible dashed placeholder for a missing edge
    // reference (see designer-node-card.tsx for the rationale).
    return (
      <div
        className={cn(
          DESIGNER_EDGE_ROW_MARKER,
          'flex min-h-9 w-full items-center rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground',
          props.meta.className,
        )}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
        data-empty="true"
        data-edge-id={edgeId ?? undefined}
      >
        {t('flux.flowDesigner.summaryMissingEdge')}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        DESIGNER_EDGE_ROW_MARKER,
        'flex w-full items-center gap-2 rounded-md border border-border px-2 py-1.5 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        summary.active && 'border-primary/40 bg-accent/80 ring-1 ring-primary/40',
        summary.selected && !summary.active && 'border-primary/40 bg-accent/40',
        props.meta.className,
      )}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
      data-edge-id={summary.id}
      data-edge-type={summary.type}
      data-selected={summary.selected ? 'true' : undefined}
      data-active={summary.active ? 'true' : undefined}
      onClick={handleClick}
    >
      <span data-slot="edge-row-flow" className="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
        <span data-slot="edge-row-source" className="truncate font-medium text-foreground">
          {sourceLabel || summary.source}
        </span>
        <span aria-hidden="true" data-slot="edge-row-arrow"
          className="text-muted-foreground">
          →
        </span>
        <span data-slot="edge-row-target" className="truncate font-medium text-foreground">
          {targetLabel || summary.target}
        </span>
      </span>
      <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px] font-normal">
        {edgeTypeLabel}
      </Badge>
    </button>
  );
}
