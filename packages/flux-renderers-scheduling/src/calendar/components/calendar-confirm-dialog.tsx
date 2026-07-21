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
  onCancel: () => void;
  onConfirm: () => void;
}

export function CalendarConfirmDialog({ confirmDialog, onCancel, onConfirm }: CalendarConfirmDialogProps) {
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
            resource: confirmDialog.targetResource,
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
