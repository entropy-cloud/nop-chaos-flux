import React from 'react';
import type { RendererComponentProps, SchemaInput } from '@nop-chaos/flux-core';
import { shallowEqual } from '@nop-chaos/flux-core';
import { useOwnScopeSelector } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { ReportInspectorSchema } from './schemas.js';
import type { ReportInspectorShellSchema } from './types.js';

type ReportInspectorLikeSchema = ReportInspectorSchema | ReportInspectorShellSchema;

interface InspectorSlice {
  hasSelection: boolean;
  inspectorBody: SchemaInput | undefined;
  resolvedSchema: SchemaInput | undefined;
}

function selectInspectorSlice(data: Record<string, unknown>): InspectorSlice {
  const inspector = data.inspector as { resolvedSchema?: SchemaInput } | undefined;
  return {
    hasSelection: data.selectionTarget != null,
    inspectorBody: data.inspectorPanels as SchemaInput | undefined,
    resolvedSchema: inspector?.resolvedSchema,
  };
}

export function ReportInspectorRenderer(props: RendererComponentProps<ReportInspectorLikeSchema>) {
  const slice = useOwnScopeSelector(selectInspectorSlice, shallowEqual);
  const { hasSelection } = slice;
  const authoredBody = props.regions.body?.render() as React.ReactNode;
  const dynamicBody = (slice.inspectorBody ?? slice.resolvedSchema) as SchemaInput | undefined;
  const emptyLabel = String(props.props.emptyLabel ?? t('flux.reportDesigner.noPanels'));
  const noSelectionLabel = String(
    props.props.noSelectionLabel ?? t('flux.reportDesigner.noSelection'),
  );

  if (!hasSelection) {
    return (
      <section
        className={cn('nop-report-inspector', props.meta.className)}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
      >
        <p data-slot="report-designer-empty">{noSelectionLabel}</p>
      </section>
    );
  }

  if (!authoredBody && !dynamicBody) {
    return (
      <section
        className={cn('nop-report-inspector', props.meta.className)}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
      >
        <p data-slot="report-designer-empty">{emptyLabel}</p>
      </section>
    );
  }

  return (
    <section
      className={cn('nop-report-inspector', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
    >
      {authoredBody ??
        (dynamicBody
          ? (props.helpers.render(dynamicBody, {
              pathSuffix: 'inspector-body',
            }) as React.ReactNode)
          : null)}
    </section>
  );
}
