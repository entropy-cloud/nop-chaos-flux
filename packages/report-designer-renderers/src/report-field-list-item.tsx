import React from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { Button } from '@nop-chaos/ui';
import type { FieldSourceSnapshot } from '@nop-chaos/report-designer-core';

type ReportFieldListItemField = FieldSourceSnapshot['groups'][number]['fields'][number];

interface ReportFieldListItemProps {
  source: FieldSourceSnapshot;
  field: ReportFieldListItemField;
  draggable: boolean;
  onDragStart?: (
    event: React.DragEvent<HTMLLIElement>,
    source: FieldSourceSnapshot,
    field: ReportFieldListItemField,
  ) => void;
  showInsert?: boolean;
  onInsert?: () => void;
  insertDisabled?: boolean;
  insertTitle?: string;
  insertDescribedBy?: string;
  children?: React.ReactNode;
}

/** Shared field-list entry for both field panel implementations (plain
 * ReportFieldPanel and schema-driven ReportFieldPanelRenderer). Owns the li
 * data-attribute contract, draggability and the insert button with its aria
 * labeling; feature asymmetry (search/ghost vs keyboard insert routing) stays
 * at the call sites via the injected callbacks. */
export function ReportFieldListItem({
  source,
  field,
  draggable,
  onDragStart,
  showInsert,
  onInsert,
  insertDisabled,
  insertTitle,
  insertDescribedBy,
  children,
}: ReportFieldListItemProps) {
  return (
    <li
      draggable={draggable}
      data-field-id={field.id}
      data-field-source-id={source.id}
      data-slot="report-field-panel-item"
      onDragStart={onDragStart ? (event) => onDragStart(event, source, field) : undefined}
    >
      {children}
      {showInsert ? (
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={insertDisabled}
          title={insertTitle}
          aria-label={t('flux.reportDesigner.insertFieldToSelection', {
            field: field.label,
          })}
          aria-describedby={insertDescribedBy}
          onClick={() => onInsert?.()}
        >
          {t('flux.reportDesigner.insert')}
        </Button>
      ) : null}
    </li>
  );
}
