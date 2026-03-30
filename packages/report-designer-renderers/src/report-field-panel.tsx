import type { FieldSourceSnapshot } from '@nop-chaos/report-designer-core';

export interface ReportFieldPanelProps {
  fieldSources: FieldSourceSnapshot[];
  className?: string;
  onFieldDragStart: (sourceId: string, fieldId: string, label: string) => void;
}

export function ReportFieldPanel({ fieldSources, className, onFieldDragStart }: ReportFieldPanelProps) {
  return (
    <div className={className}>
      <h3>Field Sources</h3>
      {fieldSources.map((source) => (
        <div key={source.id} className="field-source">
          <div className="field-source__label">{source.label}</div>
          {source.groups.map((group) => (
            <div key={group.id} className="field-group">
              <div className="field-group__items">
                {group.fields.map((field) => (
                  <div
                    key={field.id}
                    className="field-item"
                    draggable
                    onDragStart={() => onFieldDragStart(source.id, field.id, field.label)}
                  >
                    <span className="field-item__type">{field.fieldType}</span>
                    <span className="field-item__label">{field.label}</span>
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
