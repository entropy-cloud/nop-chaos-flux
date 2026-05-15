import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
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
import { cn } from '@nop-chaos/ui';
import type { ReportInspectorSchema } from './schemas.js';
import type { ReportInspectorShellSchema } from './types.js';
import { ReportInspectorRenderer } from './report-designer-inspector.js';

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
  const inspectorProps: RendererComponentProps<ReportInspectorSchema | ReportInspectorShellSchema> = {
    ...props,
    meta: {
      visible: true,
      hidden: false,
      disabled: false,
      changed: false,
    },
    props: { ...props.props, body: inspector?.resolvedSchema },
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
        <p data-slot="report-designer-empty">
          {String(props.props.noSelectionLabel ?? t('flux.reportDesigner.noSelection'))}
        </p>
      ) : inspector?.loading ? (
        <p data-slot="report-designer-empty">{t('flux.reportDesigner.loadingPanels')}</p>
      ) : inspector?.error ? (
        <div data-slot="report-designer-stack">
          <p data-slot="report-designer-empty">
            {String(props.props.errorLabel ?? t('flux.reportDesigner.loadPanelsFailed'))}
          </p>
          <p data-slot="report-designer-empty">{inspectorErrorLabel}</p>
        </div>
      ) : (
        <ReportInspectorRenderer {...inspectorProps} />
      )}
    </section>
  );
}
