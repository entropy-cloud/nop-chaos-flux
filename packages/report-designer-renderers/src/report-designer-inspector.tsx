import React from 'react';
import type { RendererComponentProps, SchemaInput } from '@nop-chaos/flux-core';
import { useOwnScopeSelector } from '@nop-chaos/flux-react';
import type { ReportInspectorSchema } from './schemas.js';

interface InspectorPanelShape {
  id: string;
  title: string;
  body: SchemaInput;
}

function toPanelShape(raw: Record<string, unknown>): InspectorPanelShape {
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    body: raw.body as SchemaInput,
  };
}

export function ReportInspectorRenderer(props: RendererComponentProps<ReportInspectorSchema>) {
  const scopeData = useOwnScopeSelector((data: Record<string, unknown>) => data);
  const hasSelection = scopeData.selectionTarget != null;
  const rawPanels = (props.props.inspectorPanels ?? []) as Record<string, unknown>[];
  const panels = rawPanels.map(toPanelShape);
  const emptyLabel = String(props.props.emptyLabel ?? 'No inspector panels available.');
  const noSelectionLabel = String(props.props.noSelectionLabel ?? 'Select a target to inspect.');

  if (!hasSelection) {
    return (
      <section className="nop-report-inspector">
        <p className="nop-report-designer__empty">{noSelectionLabel}</p>
      </section>
    );
  }

  if (panels.length === 0) {
    return (
      <section className="nop-report-inspector">
        <p className="nop-report-designer__empty">{emptyLabel}</p>
      </section>
    );
  }

  return (
    <section className="nop-report-inspector" data-testid="report-inspector">
      {panels.map((panel) => (
        <div key={panel.id} className="nop-report-designer__stack">
          <div className="nop-report-designer__section-header">
            <h4>{panel.title}</h4>
          </div>
          {props.helpers.render(panel.body, {
            pathSuffix: `inspector-panels.${panel.id}`,
          })}
        </div>
      ))}
    </section>
  );
}
