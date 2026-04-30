import React from 'react';
import type {
  FieldSourceSnapshot,
  MetadataBag,
  ReportDesignerRuntimeSnapshot,
} from '@nop-chaos/report-designer-core';
import { t } from '@nop-chaos/flux-i18n';
import { formatMetadataValue, getFieldCount } from './helpers.js';

export function renderFieldSourceSections(fieldSources: FieldSourceSnapshot[]) {
  return (
    <div data-slot="report-designer-stack">
      {fieldSources.map((source) => (
        <section key={source.id} data-slot="report-designer-section">
          <h4>{source.label}</h4>
          {source.groups.map((group) => (
            <div key={group.id} data-slot="report-designer-group">
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
    return <p data-slot="report-designer-empty">{t('flux.reportDesigner.noFieldSources')}</p>;
  }
  return renderFieldSourceSections(fieldSources);
}

export function renderFallbackInspector(meta: MetadataBag | undefined) {
  if (!meta || Object.keys(meta).length === 0) {
    return <p data-slot="report-designer-empty">{t('flux.reportDesigner.noMetadata')}</p>;
  }
  return (
    <dl data-slot="report-designer-meta-list">
      {Object.entries(meta).map(([key, value]) => (
        <div key={key} data-slot="report-designer-meta-row">
          <dt>{key}</dt>
          <dd>{formatMetadataValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function renderFallbackCanvas(snapshot: ReportDesignerRuntimeSnapshot) {
  return (
    <div data-slot="report-designer-canvas-fallback">
      <p data-slot="report-designer-eyebrow">{t('flux.reportDesigner.coreTitle')}</p>
      <h3>{snapshot.document.name}</h3>
      <p>
        {t('flux.reportDesigner.target')}:{' '}
        <strong>{snapshot.selectionTarget?.kind ?? t('flux.reportDesigner.none')}</strong>
      </p>
      <p>
        {t('flux.reportDesigner.preview')}:{' '}
        <strong>
          {snapshot.preview.lastResult
            ? t('flux.reportDesigner.ready')
            : snapshot.preview.running
              ? t('flux.reportDesigner.running')
              : t('flux.reportDesigner.idle')}
        </strong>
      </p>
      <p>
        {t('flux.reportDesigner.fields')}: <strong>{getFieldCount(snapshot.fieldSources)}</strong>
      </p>
    </div>
  );
}
