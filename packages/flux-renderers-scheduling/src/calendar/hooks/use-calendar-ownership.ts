import type { CalendarView } from '../../schemas.js';
import { useScopeSelector } from '@nop-chaos/flux-react';
import { parseISODate } from '../utils/calendar-date-utils.js';

export interface CalendarOwnershipResult {
  controlledView: CalendarView | undefined;
  controlledDate: Date | undefined;
}

export function useCalendarOwnership(
  resolved: Record<string, unknown>,
): CalendarOwnershipResult {
  const viewOwnership = (resolved.viewOwnership as string) ?? 'local';
  const dateOwnership = (resolved.dateOwnership as string) ?? 'local';
  const viewStatePath = resolved.viewStatePath as string | undefined;
  const dateStatePath = resolved.dateStatePath as string | undefined;

  const isScopeView = viewOwnership === 'scope' && !!viewStatePath;
  const isScopeDate = dateOwnership === 'scope' && !!dateStatePath;

  const scopeViewRaw = useScopeSelector((s: Record<string, unknown>) => {
    if (!isScopeView || !viewStatePath) return undefined;
    const keys = viewStatePath.split('.');
    let val: unknown = s;
    for (const k of keys) { if (val && typeof val === 'object') val = (val as Record<string, unknown>)[k]; else return undefined; }
    return val as CalendarView | undefined;
  });

  const scopeDateRaw = useScopeSelector((s: Record<string, unknown>) => {
    if (!isScopeDate || !dateStatePath) return undefined;
    const keys = dateStatePath.split('.');
    let val: unknown = s;
    for (const k of keys) { if (val && typeof val === 'object') val = (val as Record<string, unknown>)[k]; else return undefined; }
    return val as string | undefined;
  });

  const scopeView = isScopeView ? scopeViewRaw : undefined;
  const scopeDate = isScopeDate ? scopeDateRaw : undefined;

  const controlledView = viewOwnership === 'controlled'
    ? (resolved.view as CalendarView) ?? 'month'
    : viewOwnership === 'scope' && scopeView
      ? scopeView
      : undefined;

  const controlledDate = dateOwnership === 'controlled'
    ? (resolved.date ? (parseISODate(resolved.date as string) ?? undefined) : undefined)
    : dateOwnership === 'scope' && scopeDate
      ? parseISODate(scopeDate)
      : undefined;

  return { controlledView, controlledDate };
}
