import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { FieldSourceSnapshot } from '@nop-chaos/report-designer-core';
import { getFieldCount, joinClassNames } from './helpers.js';
import { renderFieldSourceSections } from './fallbacks.js';
import type { ReportFieldPanelSchema } from './types.js';

export function ReportFieldPanelRenderer(props: RendererComponentProps<ReportFieldPanelSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const scope = useRenderScope();
  const scopeData = useScopeSelector((data: Record<string, unknown>) => data);
  const fieldSources = Array.isArray(scopeData.fieldSources) ? (scopeData.fieldSources as FieldSourceSnapshot[]) : [];
  const designer = scopeData.designer as { documentName?: string; fieldCount?: number } | undefined;

  return (
    <section className={joinClassNames('nop-report-designer__field-panel-shell', props.meta.className)}>
      {hasRendererSlotContent(titleContent) ? (
        <header className="nop-report-designer__section-header">
          <h3>{titleContent}</h3>
          <span>{designer?.fieldCount ?? getFieldCount(fieldSources)} fields</span>
        </header>
      ) : designer?.documentName ? (
        <header className="nop-report-designer__section-header">
          <h3>{designer.documentName}</h3>
          <span>{designer?.fieldCount ?? getFieldCount(fieldSources)} fields</span>
        </header>
      ) : null}
      {fieldSources.length === 0 ? (
        <p className="nop-report-designer__empty">{String(props.props.emptyLabel ?? 'No field sources registered.')}</p>
      ) : (
        renderFieldSourceSections(fieldSources)
      )}
    </section>
  );
}

