import React from 'react';
import type { RendererComponentProps, SchemaInput } from '@nop-chaos/flux-core';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useOwnScopeSelector,
} from '@nop-chaos/flux-react';
import type {
  ReportDesignerRuntimeSnapshot,
  ReportSelectionTarget,
} from '@nop-chaos/report-designer-core';
import { t } from '@nop-chaos/flux-i18n';
import { ClipboardList, TriangleAlert } from 'lucide-react';
import { cn } from '@nop-chaos/ui';
import type { ReportInspectorShellSchema } from './types.js';

export function ReportInspectorShellRenderer(
  props: RendererComponentProps<ReportInspectorShellSchema>,
) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const scopeData = useOwnScopeSelector(
    (data: Record<string, unknown>) => ({
      selectionTarget: data.selectionTarget,
      inspector: data.inspector,
    }),
    (a, b) => a.selectionTarget === b.selectionTarget && a.inspector === b.inspector,
  );
  const target = scopeData.selectionTarget as ReportSelectionTarget | undefined;
  const inspector = scopeData.inspector as ReportDesignerRuntimeSnapshot['inspector'] | undefined;
  const inspectorErrorLabel = inspector?.error != null ? String(inspector.error) : undefined;
  const inspectorSchema: SchemaInput = {
    type: 'report-inspector',
    body: inspector?.resolvedSchema,
    emptyLabel: props.props.emptyLabel,
    noSelectionLabel: props.props.noSelectionLabel,
  };

  return (
    <section
      className={cn('nop-report-inspector-shell', props.meta.className)}
      data-slot="report-designer-inspector-shell"
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
    >
      {hasRendererSlotContent(titleContent) ? (
        <header data-slot="report-designer-section-header">
          <h3>{titleContent}</h3>
          <span>{target?.kind ?? t('flux.reportDesigner.none')}</span>
        </header>
      ) : null}

      {!target ? (
        <div
          data-slot="report-designer-empty"
          data-testid="report-inspector-empty"
          className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-5 m-3 text-center"
        >
          <ClipboardList className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            {String(props.props.noSelectionLabel ?? t('flux.reportDesigner.noSelection'))}
          </p>
        </div>
      ) : inspector?.loading ? (
        <div
          data-slot="report-designer-loading"
          data-testid="report-inspector-loading"
          aria-busy="true"
          className="flex flex-col gap-2 p-3"
        >
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-8 w-full animate-pulse rounded bg-muted" />
          <span className="sr-only">{t('flux.reportDesigner.loadingPanels')}</span>
        </div>
      ) : inspector?.error ? (
        <div
          data-slot="report-designer-stack"
          data-testid="report-inspector-error"
          className="m-3 flex flex-col gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
        >
          <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <TriangleAlert className="h-4 w-4" aria-hidden="true" />
            {String(props.props.errorLabel ?? t('flux.reportDesigner.loadPanelsFailed'))}
          </p>
          <p className="text-xs text-muted-foreground">{inspectorErrorLabel}</p>
        </div>
      ) : (
        (props.helpers.render(inspectorSchema, { pathSuffix: 'inspector' }) as React.ReactNode)
      )}
    </section>
  );
}
