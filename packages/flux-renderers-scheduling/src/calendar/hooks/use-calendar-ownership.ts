import type { CalendarView } from '../../schemas.js';
import {
  resolveOwnershipMode,
  useOwnershipScopeValue,
  useWarnScopeDegraded,
} from '@nop-chaos/flux-react';
import { parseISODate } from '../utils/calendar-date-utils.js';

export interface CalendarOwnershipResult {
  controlledView: CalendarView | undefined;
  controlledDate: Date | undefined;
}

export function useCalendarOwnership(
  resolved: Record<string, unknown>,
): CalendarOwnershipResult {
  const viewMode = resolveOwnershipMode({
    ownership: resolved.viewOwnership,
    statePath: resolved.viewStatePath,
  });
  const dateMode = resolveOwnershipMode({
    ownership: resolved.dateOwnership,
    statePath: resolved.dateStatePath,
  });
  useWarnScopeDegraded(
    viewMode.scopeDegraded,
    '[flux:calendar] viewOwnership="scope" but viewStatePath is missing; falling back to uncontrolled view.',
  );
  useWarnScopeDegraded(
    dateMode.scopeDegraded,
    '[flux:calendar] dateOwnership="scope" but dateStatePath is missing; falling back to uncontrolled date.',
  );

  const scopeView = useOwnershipScopeValue<CalendarView | undefined>(viewMode.ownership, viewMode.statePath);
  const scopeDate = useOwnershipScopeValue<string | undefined>(dateMode.ownership, dateMode.statePath);

  const controlledView = viewMode.ownership === 'controlled'
    ? (resolved.view as CalendarView) ?? 'month'
    : viewMode.ownership === 'scope'
      ? scopeView
      : undefined;

  const controlledDate = dateMode.ownership === 'controlled'
    ? (resolved.date ? (parseISODate(resolved.date as string) ?? undefined) : undefined)
    : dateMode.ownership === 'scope'
      ? (scopeDate ? parseISODate(scopeDate) : undefined)
      : undefined;

  return { controlledView, controlledDate };
}
