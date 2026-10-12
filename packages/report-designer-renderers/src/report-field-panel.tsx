import './report-field-panel.css';

import { useMemo, useState, type DragEvent } from 'react';
import type { FieldSourceSnapshot } from '@nop-chaos/report-designer-core';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Input, cn } from '@nop-chaos/ui';
import { ReportFieldListItem } from './report-field-list-item.js';

/** plan 528 Phase 2：字段拖拽 ghost（对齐 page-designer 模式）——setDragImage
 * feature-detect 守卫，离屏 fixed + pointer-events:none，微任务清理。 */
function setFieldDragGhost(event: DragEvent<HTMLElement>, fieldType: string, label: string): void {
  const dataTransfer = event.dataTransfer as (DataTransfer & { setDragImage?: unknown }) | null;
  if (!dataTransfer || typeof dataTransfer.setDragImage !== 'function') {
    return;
  }
  const ghost = document.createElement('div');
  ghost.setAttribute('data-testid', 'report-field-drag-ghost');
  ghost.textContent = `${fieldType} · ${label}`;
  ghost.style.cssText = [
    'position:fixed',
    'top:-200px',
    'left:-200px',
    'z-index:-1',
    'pointer-events:none',
    'display:inline-flex',
    'align-items:center',
    'gap:6px',
    'padding:6px 12px',
    'border-radius:8px',
    'border:1px solid hsl(var(--primary))',
    'background:hsl(var(--secondary))',
    'box-shadow:0 4px 12px rgba(15,23,42,0.16)',
    'font-size:13px',
    'font-weight:500',
    'white-space:nowrap',
  ].join(';');
  document.body.appendChild(ghost);
  try {
    // 宿主可能存在 setDragImage 但抛 Not implemented（happy-dom 等）——降级默认截图
    dataTransfer.setDragImage(ghost, 12, 12);
  } catch {
    ghost.remove();
    return;
  }
  window.setTimeout(() => {
    ghost.remove();
  }, 0);
}

/** plan 528 Phase 2：字段过滤纯函数（label/fieldType 子串，大小写不敏感）。 */
export function matchesReportFieldQuery(
  field: { label: string; fieldType?: string },
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    field.label.toLowerCase().includes(needle) ||
    (field.fieldType ?? '').toLowerCase().includes(needle)
  );
}

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
  // plan 528 Phase 2：字段检索（label/fieldType 子串）+ 空结果态
  const [query, setQuery] = useState('');
  const totalMatches = useMemo(() => {
    let count = 0;
    for (const source of fieldSources) {
      for (const group of source.groups) {
        for (const field of group.fields) {
          if (matchesReportFieldQuery(field, query)) count += 1;
        }
      }
    }
    return count;
  }, [fieldSources, query]);
  const isFiltering = query.trim().length > 0;

  return (
    <div className={cn('nop-report-field-panel', className)} data-slot="report-field-panel-shell">
      <span id="report-field-insert-disabled-reason" className="sr-only">
        {t('flux.reportDesigner.insertDisabledNoSelection')}
      </span>
      <div className="px-3 pb-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('flux.reportDesigner.fieldSearchPlaceholder')}
          aria-label={t('flux.reportDesigner.fieldSearchLabel')}
          data-testid="report-field-search"
          className="h-8 text-sm"
        />
      </div>
      {isFiltering && totalMatches === 0 ? (
        <div
          data-testid="report-field-empty"
          className="mx-3 mb-3 flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-5 text-center"
        >
          <span className="text-sm text-muted-foreground">
            {t('flux.reportDesigner.fieldNoMatch', { query: query.trim() })}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => setQuery('')}>
            {t('flux.reportDesigner.fieldClearSearch')}
          </Button>
        </div>
      ) : null}
      {fieldSources.map((source) => (
        <div key={source.id} data-slot="report-field-panel-source" className={cn(isFiltering && 'hidden')}>
          <div data-slot="report-field-panel-source-label">{source.label}</div>
          {source.groups.map((group) => (
            <div key={group.id} data-slot="report-field-panel-group">
              <ul data-slot="report-field-panel-items">
                {group.fields.map((field) => {
                  if (isFiltering && !matchesReportFieldQuery(field, query)) {
                    return null;
                  }
                  return (
                    <ReportFieldListItem
                      key={field.id}
                      source={source}
                      field={field}
                      draggable
                      showInsert
                      onDragStart={(event) => {
                        writeReportFieldDragPayload(event, createReportFieldDragPayload(source, field));
                        setFieldDragGhost(event, field.fieldType ?? 'field', field.label);
                        onFieldDragStart(source.id, field.id, field.label);
                      }}
                      onInsert={() => onFieldInsert?.(source.id, field.id, field.label)}
                      insertDisabled={
                        !onFieldInsert || (canInsertField ? !canInsertField(source.id, field.id) : false)
                      }
                      insertTitle={
                        canInsertField && !canInsertField(source.id, field.id)
                          ? t('flux.reportDesigner.insertDisabledNoSelection')
                          : undefined
                      }
                      insertDescribedBy={
                        canInsertField && !canInsertField(source.id, field.id)
                          ? 'report-field-insert-disabled-reason'
                          : undefined
                      }
                    >
                      <div data-slot="report-field-panel-drag-handle">
                        <span data-slot="report-field-panel-item-type">{field.fieldType}</span>
                        <span data-slot="report-field-panel-item-label">{field.label}</span>
                      </div>
                    </ReportFieldListItem>
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
