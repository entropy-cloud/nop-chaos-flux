import type { CalendarEvent } from '../../schemas.js';
import type { PositionedEvent, CalendarDateRange, ConflictInfo } from '../calendar.types.js';
import { parseISODate, diffInDays, addDays, toISODateString } from './calendar-date-utils.js';

export interface MonthPositionInput {
  events: CalendarEvent[];
  resources: { id: string }[];
  dateRange: CalendarDateRange;
  maxConcurrent: number;
}

export interface SplitEventBlock {
  eventId: string;
  resourceId: string;
  date: string;
  originalEvent: CalendarEvent;
  isSplit: boolean;
  dayIndex: number;
  totalDays: number;
  /** Precomputed epoch of `date` — sort comparators must not re-parse dates. */
  dateEpoch: number;
}

export function splitMultiDayEvents(events: CalendarEvent[]): SplitEventBlock[] {
  const result: SplitEventBlock[] = [];

  for (const event of events) {
    const startDate = parseISODate(event.start);
    const endDate = parseISODate(event.end);
    if (!startDate || !endDate) continue;

    const totalDays = diffInDays(startDate, endDate) + 1;
    const resourceId = event.resourceId ?? '';

    for (let i = 0; i < totalDays; i++) {
      const dayDate = addDays(startDate, i);
      result.push({
        eventId: event.id,
        resourceId,
        date: toISODateString(dayDate),
        originalEvent: event,
        isSplit: totalDays > 1,
        dayIndex: i,
        totalDays,
        dateEpoch: dayDate.getTime(),
      });
    }
  }

  return result;
}

function normalizeResourceId(resourceId: string, resources: { id: string }[]): string {
  if (resources.length === 1 && resources[0].id === '_default' && (resourceId === '' || resourceId === '_default')) {
    return '_default';
  }
  return resourceId || '_default';
}

function groupEventsByResourceDate(
  splitEvents: SplitEventBlock[],
  resources: { id: string }[],
): Map<string, Map<string, SplitEventBlock[]>> {
  const groups = new Map<string, Map<string, SplitEventBlock[]>>();

  for (const block of splitEvents) {
    const normalizedId = normalizeResourceId(block.resourceId, resources);
    if (!groups.has(normalizedId)) {
      groups.set(normalizedId, new Map());
    }
    const dateMap = groups.get(normalizedId)!;
    if (!dateMap.has(block.date)) {
      dateMap.set(block.date, []);
    }
    dateMap.get(block.date)!.push(block);
  }

  return groups;
}

function sortEventsByStartAndDuration(events: SplitEventBlock[]): void {
  events.sort((a, b) => {
    const cmp = a.dateEpoch - b.dateEpoch;
    if (cmp !== 0) return cmp;
    return b.totalDays - a.totalDays;
  });
}

export function positionEventsInMonth(
  input: MonthPositionInput,
): Map<string, Map<string, PositionedEvent[]>> {
  const { events, resources, dateRange, maxConcurrent } = input;
  const result = new Map<string, Map<string, PositionedEvent[]>>();

  const splitEvents = splitMultiDayEvents(events);
  const groups = groupEventsByResourceDate(splitEvents, resources);

  const effectiveMax = maxConcurrent <= 0 ? Infinity : maxConcurrent;

  for (const resource of resources) {
    const resourceId = resource.id;
    const rowMap = new Map<string, PositionedEvent[]>();
    result.set(resourceId, rowMap);

    const dateMap = groups.get(resourceId);
    if (!dateMap) continue;

    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      const dateStr = toISODateString(current);
      const dayBlocks = dateMap.get(dateStr);

      if (dayBlocks && dayBlocks.length > 0) {
        sortEventsByStartAndDuration(dayBlocks);

        const visibleCount = effectiveMax === Infinity
          ? dayBlocks.length
          : Math.min(dayBlocks.length, effectiveMax);
        const overflowCount = effectiveMax === Infinity
          ? 0
          : Math.max(0, dayBlocks.length - effectiveMax);
        const widthPerEvent = 100 / visibleCount;

        const positioned: PositionedEvent[] = [];

        for (let i = 0; i < visibleCount; i++) {
          const block = dayBlocks[i];
          positioned.push({
            event: block.originalEvent,
            left: i * widthPerEvent,
            width: widthPerEvent,
            isSplit: block.isSplit,
            eventId: block.eventId,
            concurrentIndex: i,
            maxConcurrent: visibleCount,
          });
        }

        if (overflowCount > 0) {
          positioned.push({
            event: dayBlocks[0].originalEvent,
            left: 0,
            width: widthPerEvent,
            eventId: `overflow-${dateStr}-${resourceId}`,
            concurrentIndex: visibleCount,
            maxConcurrent: visibleCount,
            overflowCount,
          });
        }

        rowMap.set(dateStr, positioned);
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  return result;
}

export interface ConflictInput {
  events: CalendarEvent[];
  resourceId: string;
  date: string;
  allDay?: boolean;
}

export function detectConflicts(input: ConflictInput): ConflictInfo | undefined {
  const { events, resourceId, date } = input;

  const resourceDateEvents = events.filter((evt) => {
    const evtResourceId = evt.resourceId ?? '';
    return evtResourceId === resourceId && dateOverlapsOnDay(evt, date);
  });

  if (resourceDateEvents.length < 2) return undefined;

  const conflict = sweepOverlaps(resourceDateEvents);
  if (!conflict) return undefined;

  return {
    resourceId,
    date,
    overlappingEvents: conflict.overlappingEvents,
  };
}

function extractDatePart(isoStr: string): string {
  return isoStr.split('T')[0] ?? isoStr;
}

/**
 * Month-grid batch conflict detection, equivalent to calling detectConflicts
 * per (resource, day) but with membership bucketed in one O(events x days)
 * pass instead of O(resources x days x events) filters per render. The sweep
 * per non-empty bucket is the same algorithm as detectConflicts (resource id
 * matched raw, no normalization — same as the per-cell path).
 */
export function detectMonthConflicts(input: {
  events: CalendarEvent[];
  days: Date[];
}): Map<string, Set<string>> {
  const { events, days } = input;
  const result = new Map<string, Set<string>>();
  if (events.length === 0 || days.length === 0) return result;

  const dateStrs = days.map((day) => toISODateString(day));
  const buckets = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const eventDateStart = extractDatePart(event.start);
    const eventDateEnd = extractDatePart(event.end);
    const resourceKey = event.resourceId ?? '';
    for (const dateStr of dateStrs) {
      if (eventDateStart <= dateStr && eventDateEnd >= dateStr) {
        const key = `${resourceKey}:${dateStr}`;
        const bucket = buckets.get(key);
        if (bucket) bucket.push(event);
        else buckets.set(key, [event]);
      }
    }
  }

  for (const [key, bucket] of buckets) {
    if (bucket.length < 2) continue;
    const conflict = sweepOverlaps(bucket);
    if (!conflict) continue;
    result.set(key, new Set(conflict.overlappingEvents.map((e) => e.id)));
  }
  return result;
}

function sweepOverlaps(resourceDateEvents: CalendarEvent[]): ConflictInfo | undefined {
  const parsed = resourceDateEvents
    .map((evt) => ({
      event: evt,
      start: parseISODateTime(evt.start),
      end: parseISODateTime(evt.end),
    }))
    .filter((p): p is { event: CalendarEvent; start: Date; end: Date } => p.start != null && p.end != null);

  if (parsed.length < 2) return undefined;

  parsed.sort((a, b) => a.start.getTime() - b.start.getTime());

  const overlappingSet: Set<CalendarEvent> = new Set();
  const active: { event: CalendarEvent; end: Date }[] = [];

  for (const item of parsed) {
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].end <= item.start) {
        active.splice(i, 1);
      }
    }

    if (active.length > 0) {
      overlappingSet.add(item.event);
      for (const a of active) {
        overlappingSet.add(a.event);
      }
    }

    active.push({ event: item.event, end: item.end });
  }

  if (overlappingSet.size === 0) return undefined;

  return {
    resourceId: '',
    date: '',
    overlappingEvents: [...overlappingSet],
  };
}

function parseISODateTime(isoStr: string): Date | undefined {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return undefined;
  return d;
}

function dateOverlapsOnDay(event: CalendarEvent, dateStr: string): boolean {
  const eventDateStart = extractDatePart(event.start);
  const eventDateEnd = extractDatePart(event.end);
  return eventDateStart <= dateStr && eventDateEnd >= dateStr;
}


