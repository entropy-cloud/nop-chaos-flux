import React from 'react';
import type {
  FieldSourceSnapshot,
  MetadataBag,
  ReportDesignerRuntimeSnapshot,
} from '@nop-chaos/report-designer-core';
import { formatMetadataValue, getFieldCount } from './helpers.js';

export function renderFieldSourceSections(fieldSources: FieldSourceSnapshot[]) {
  return (
    <div className="na-report-designer__stack">
      {fieldSources.map((source) => (
        <section key={source.id} className="na-report-designer__section">
          <h4>{source.label}</h4>
          {source.groups.map((group) => (
            <div key={group.id} className="na-report-designer__group">
              <strong>{group.label}</strong>
              <ul>
                {group.fields.map((field) => (
                  <li key={field.id}>{field.label}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

export function renderFallbackFieldPanel(fieldSources: FieldSourceSnapshot[]) {
  if (fieldSources.length === 0) {
    return <p className="na-report-designer__empty">No field sources registered.</p>;
  }
  return renderFieldSourceSections(fieldSources);
}

export function renderFallbackInspector(meta: MetadataBag | undefined) {
  if (!meta || Object.keys(meta).length === 0) {
    return <p className="na-report-designer__empty">No metadata for the current target.</p>;
  }
  return (
    <dl className="na-report-designer__meta-list">
      {Object.entries(meta).map(([key, value]) => (
        <div key={key} className="na-report-designer__meta-row">
          <dt>{key}</dt>
          <dd>{formatMetadataValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function renderFallbackCanvas(snapshot: ReportDesignerRuntimeSnapshot) {
  return (
    <div className="na-report-designer__canvas-fallback">
      <p className="na-report-designer__eyebrow">Report Designer Core</p>
      <h3>{snapshot.document.name}</h3>
      <p>Target: <strong>{snapshot.selectionTarget?.kind ?? 'none'}</strong></p>
      <p>Preview: <strong>{snapshot.preview.lastResult ? 'ready' : snapshot.preview.running ? 'running' : 'idle'}</strong></p>
      <p>Fields: <strong>{getFieldCount(snapshot.fieldSources)}</strong></p>
    </div>
  );
}
