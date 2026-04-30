import React from 'react';
import type { RendererComponentProps, SchemaInput } from '@nop-chaos/flux-core';
import { useOwnScopeSelector } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { ReportInspectorSchema } from './schemas.js';

export function ReportInspectorRenderer(props: RendererComponentProps<ReportInspectorSchema>) {
  const scopeData = useOwnScopeSelector((data: Record<string, unknown>) => data);
  const hasSelection = scopeData.selectionTarget != null;
  const inspector = scopeData.inspector as { resolvedSchema?: SchemaInput } | undefined;
  const body = (props.props.body ?? scopeData.inspectorBody ?? inspector?.resolvedSchema) as
    | SchemaInput
    | undefined;
  const emptyLabel = String(props.props.emptyLabel ?? 'No inspector panels available.');
  const noSelectionLabel = String(props.props.noSelectionLabel ?? 'Select a target to inspect.');

  if (!hasSelection) {
    return (
      <section className={cn('nop-report-inspector')}>
        <p data-slot="report-designer-empty">{noSelectionLabel}</p>
      </section>
    );
  }

  if (!body) {
    return (
      <section className={cn('nop-report-inspector')}>
        <p data-slot="report-designer-empty">{emptyLabel}</p>
      </section>
    );
  }

  return (
    <section className={cn('nop-report-inspector')} data-testid="report-inspector">
      {props.helpers.render(body, {
        pathSuffix: 'inspector-body',
      })}
    </section>
  );
}
