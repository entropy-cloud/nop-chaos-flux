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
        <div key={source.id} className="field-source">
          <div data-slot="field-source-label">{source.label}</div>
          {source.groups.map((group) => (
            <div key={group.id} className="field-group">
              <div data-slot="field-group-items">
                {group.fields.map((field) => (
                  <div
                    key={field.id}
                    className="field-item"
                    draggable
                    onDragStart={() => onFieldDragStart(source.id, field.id, field.label)}
                  >
                    <span data-slot="field-item-type">{field.fieldType}</span>
                    <span data-slot="field-item-label">{field.label}</span>
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
