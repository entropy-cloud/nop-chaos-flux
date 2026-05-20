import './report-field-panel.css';

import type { DragEvent } from 'react';
import type { FieldSourceSnapshot } from '@nop-chaos/report-designer-core';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn } from '@nop-chaos/ui';

export const REPORT_FIELD_DRAG_MIME = 'application/x-nop-report-field';

export function createReportFieldDragPayload(
  source: FieldSourceSnapshot,
  field: FieldSourceSnapshot['groups'][number]['fields'][number],
) {
  return {
    type: field.fieldType ?? 'field',
    sourceId: source.id,
    fieldId: field.id,
    label: field.label,
    data: { ...field },
  };
}

export function writeReportFieldDragPayload(
  event: DragEvent<HTMLElement>,
  payload: ReturnType<typeof createReportFieldDragPayload>,
) {
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData(REPORT_FIELD_DRAG_MIME, JSON.stringify(payload));
  event.dataTransfer.setData('text/plain', payload.label);
}

export function readReportFieldDragPayload(event: DragEvent<HTMLElement>) {
  if (!event.dataTransfer || typeof event.dataTransfer.getData !== 'function') {
    return undefined;
  }

  const rawPayload = event.dataTransfer.getData(REPORT_FIELD_DRAG_MIME);
  if (!rawPayload) {
    return undefined;
  }

  try {
    const payload = JSON.parse(rawPayload);
    if (
      payload &&
      typeof payload === 'object' &&
      typeof payload.type === 'string' &&
      typeof payload.sourceId === 'string' &&
      typeof payload.fieldId === 'string' &&
      typeof payload.label === 'string' &&
      payload.data &&
      typeof payload.data === 'object' &&
      !Array.isArray(payload.data)
    ) {
      return payload as ReturnType<typeof createReportFieldDragPayload>;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export interface ReportFieldPanelProps {
  fieldSources: FieldSourceSnapshot[];
  className?: string;
  onFieldDragStart: (sourceId: string, fieldId: string, label: string) => void;
  onFieldInsert?: (sourceId: string, fieldId: string, label: string) => void;
  canInsertField?: (sourceId: string, fieldId: string) => boolean;
}

export function ReportFieldPanel({
  fieldSources,
  className,
  onFieldDragStart,
  onFieldInsert,
  canInsertField,
}: ReportFieldPanelProps) {
  return (
    <div className={cn('nop-report-field-panel', className)} data-slot="report-field-panel-shell">
      {fieldSources.map((source) => (
        <div key={source.id} data-slot="report-field-panel-source">
          <div data-slot="report-field-panel-source-label">{source.label}</div>
          {source.groups.map((group) => (
            <div key={group.id} data-slot="report-field-panel-group">
              <ul data-slot="report-field-panel-items">
                {group.fields.map((field) => {
                  const fieldPayload = createReportFieldDragPayload(source, field);
                  return (
                    <li
                      key={field.id}
                      data-slot="report-field-panel-item"
                      draggable
                      data-field-id={field.id}
                      data-field-source-id={source.id}
                      onDragStart={(event) => {
                        writeReportFieldDragPayload(event, fieldPayload);
                        onFieldDragStart(source.id, field.id, field.label);
                      }}
                    >
                      <div
                        data-slot="report-field-panel-drag-handle"
                      >
                        <span data-slot="report-field-panel-item-type">{field.fieldType}</span>
                        <span data-slot="report-field-panel-item-label">{field.label}</span>
                     </div>
                     <Button
                       type="button"
                       size="xs"
                      variant="ghost"
                      disabled={
                        !onFieldInsert || (canInsertField ? !canInsertField(source.id, field.id) : false)
                      }
                       aria-label={t('flux.reportDesigner.insertFieldToSelection', {
                         field: field.label,
                       })}
                       onClick={() => onFieldInsert?.(source.id, field.id, field.label)}
                      >
                        {t('flux.reportDesigner.insert')}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
