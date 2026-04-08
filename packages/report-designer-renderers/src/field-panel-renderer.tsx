import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent, useOwnScopeSelector } from '@nop-chaos/flux-react';
import type { FieldSourceSnapshot } from '@nop-chaos/report-designer-core';
import { getFieldCount, joinClassNames } from './helpers.js';
import type { ReportFieldPanelSchema } from './types.js';

export function ReportFieldPanelRenderer(props: RendererComponentProps<ReportFieldPanelSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const scopeData = useOwnScopeSelector((data: Record<string, unknown>) => data);

  const schemaFieldSources = props.props['fieldSources'] as FieldSourceSnapshot[] | undefined;
  const scopeFieldSources = Array.isArray(scopeData.fieldSources)
    ? (scopeData.fieldSources as FieldSourceSnapshot[])
    : [];
  const fieldSources: FieldSourceSnapshot[] = Array.isArray(schemaFieldSources) && schemaFieldSources.length > 0
    ? schemaFieldSources
    : scopeFieldSources;

  const designer = scopeData.designer as { documentName?: string; fieldCount?: number } | undefined;

  const showHeader = props.props.showFieldSourceHeader !== false;
  const dragEnabled = props.props.dragEnabled !== false;
  const emptyLabel = String(props.props.emptyLabel ?? 'No field sources registered.');

  return (
    <section className={joinClassNames('nop-report-designer', props.meta.className)} data-slot="report-field-panel-shell">
      {hasRendererSlotContent(titleContent) ? (
        <header data-slot="report-designer-section-header">
          <h3>{titleContent}</h3>
          <span>{designer?.fieldCount ?? getFieldCount(fieldSources)} fields</span>
        </header>
      ) : designer?.documentName ? (
        <header data-slot="report-designer-section-header">
          <h3>{designer.documentName}</h3>
          <span>{designer?.fieldCount ?? getFieldCount(fieldSources)} fields</span>
        </header>
      ) : null}
      {fieldSources.length === 0 ? (
        <p data-slot="report-designer-empty">{emptyLabel}</p>
      ) : (
        <div data-slot="report-designer-stack">
          {fieldSources.map((source) => (
            <section key={source.id} data-slot="report-designer-section">
              {showHeader ? <h4>{source.label}</h4> : null}
              {source.groups.map((group) => (
                <div key={group.id} data-slot="report-designer-group">
                  {showHeader ? <strong>{group.label}</strong> : null}
                  <ul>
                    {group.fields.map((field) => (
                      <li
                        key={field.id}
                        draggable={dragEnabled}
                        data-field-id={field.id}
                        data-field-source-id={source.id}
                      >
                        {field.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
