import { useState } from 'react';
import type { CalendarEvent } from '../../schemas.js';

export interface ConfirmDialogState {
  event: CalendarEvent;
  targetDate: string;
  targetResource: string;
}

export function useCalendarConfirmDialog() {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const handleSwapConfirm = (payload: {
    eventId: string;
    fromResource: string;
    toResource: string;
    fromDate: string;
    toDate: string;
    event: CalendarEvent;
  }) => {
    setConfirmDialog({
      event: payload.event,
      targetDate: payload.toDate,
      targetResource: payload.toResource,
    });
  };

  const cancelSwap = () => {
    setConfirmDialog(null);
  };

  return { confirmDialog, setConfirmDialog, handleSwapConfirm, cancelSwap };
}
