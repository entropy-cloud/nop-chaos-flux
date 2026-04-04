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
        <p className="nop-report-designer__empty">{emptyLabel}</p>
      ) : (
        <div className="nop-report-designer__stack">
          {fieldSources.map((source) => (
            <section key={source.id} className="nop-report-designer__section">
              {showHeader ? <h4>{source.label}</h4> : null}
              {source.groups.map((group) => (
                <div key={group.id} className="nop-report-designer__group">
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
