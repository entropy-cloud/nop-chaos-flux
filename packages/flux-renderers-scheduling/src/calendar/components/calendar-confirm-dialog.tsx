import React from 'react';
import { Button } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { CalendarOverlay } from './calendar-overlay.js';
import type { CalendarEvent } from '../../schemas.js';

interface CalendarConfirmDialogProps {
  confirmDialog: {
    event: CalendarEvent;
    targetDate: string;
    targetResource: string;
  };
  /** [G4-R4-视角11-01] 宿主侧解析出的资源显示名——正文不再暴露内部 ID
   *  或空资源占位符（_default）。缺省回退原始 ID。 */
  resourceLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CalendarConfirmDialog({ confirmDialog, resourceLabel, onCancel, onConfirm }: CalendarConfirmDialogProps) {
  return (
    <CalendarOverlay
      onEscape={onCancel}
      onClick={onCancel}
      ariaLabel={t('scheduling.calendar.confirmMove')}
    >
      <div
        className="nop-calendar-confirm-dialog"
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); e.stopPropagation(); }}
      >
        <div className="nop-calendar-confirm-title">
          {t('scheduling.calendar.confirmMove')}
        </div>
        <div className="nop-calendar-confirm-body">
          {t('scheduling.calendar.moveConfirm', {
            title: confirmDialog.event.title,
            date: confirmDialog.targetDate,
            resource: resourceLabel || confirmDialog.targetResource,
          })}
        </div>
        <div className="nop-calendar-confirm-actions">
          <Button variant="outline" type="button" onClick={onCancel}>
            {t('flux.common.cancel')}
          </Button>
          <Button type="button" onClick={onConfirm}>
            {t('flux.common.confirm')}
          </Button>
        </div>
      </div>
    </CalendarOverlay>
  );
}
