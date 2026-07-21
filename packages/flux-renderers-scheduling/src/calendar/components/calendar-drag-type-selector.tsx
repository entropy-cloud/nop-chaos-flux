import React from 'react';
import { Button } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { CalendarOverlay } from './calendar-overlay.js';

interface ShiftTypeOption {
  type: string;
  label: string;
  color: string;
}

interface CalendarDragTypeSelectorProps {
  shiftTypes: ShiftTypeOption[];
  onSelectType: (type: string) => void;
  onDismiss: () => void;
}

export function CalendarDragTypeSelector({ shiftTypes, onSelectType, onDismiss }: CalendarDragTypeSelectorProps) {
  return (
    <CalendarOverlay
      onEscape={onDismiss}
      onClick={onDismiss}
      ariaLabel={t('scheduling.calendar.selectType')}
    >
      <div
        className="nop-calendar-type-selector"
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onDismiss(); e.stopPropagation(); }}
      >
        <div className="nop-calendar-type-selector-title">
          {t('scheduling.calendar.selectType')}
        </div>
        <div className="nop-calendar-type-selector-list">
          {shiftTypes.map((st) => (
            <Button
              key={st.type}
              type="button"
              className="nop-calendar-type-selector-btn"
              style={{ backgroundColor: st.color }}
              onClick={() => onSelectType(st.type)}
            >
              {st.label}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          type="button"
          className="nop-calendar-type-selector-cancel"
          onClick={onDismiss}
        >
          {t('flux.common.cancel')}
        </Button>
      </div>
    </CalendarOverlay>
  );
}
