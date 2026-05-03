import './report-field-panel.css';

import type { FieldSourceSnapshot } from '@nop-chaos/report-designer-core';
import { t } from '@nop-chaos/flux-i18n';

export interface ReportFieldPanelProps {
  fieldSources: FieldSourceSnapshot[];
  className?: string;
  onFieldDragStart: (sourceId: string, fieldId: string, label: string) => void;
}

export function ReportFieldPanel({
  fieldSources,
  className,
  onFieldDragStart,
}: ReportFieldPanelProps) {
  return (
    <div className={className}>
      <h3>{t('flux.reportDesigner.fieldSources')}</h3>
      {fieldSources.map((source) => (
        <div key={source.id} data-slot="report-field-panel-source">
          <div data-slot="report-field-panel-source-label">{source.label}</div>
          {source.groups.map((group) => (
            <div key={group.id} data-slot="report-field-panel-group">
              <div data-slot="report-field-panel-items">
                {group.fields.map((field) => (
                  <div
                    key={field.id}
                    data-slot="report-field-panel-item"
                    draggable
                    onDragStart={() => onFieldDragStart(source.id, field.id, field.label)}
                  >
                    <span data-slot="report-field-panel-item-type">{field.fieldType}</span>
                    <span data-slot="report-field-panel-item-label">{field.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
