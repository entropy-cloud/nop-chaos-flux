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
    const dateA = parseISODate(a.date);
    const dateB = parseISODate(b.date);
    if (!dateA || !dateB) return 0;
    const cmp = dateA.getTime() - dateB.getTime();
    if (cmp !== 0) return cmp;
    const durA = a.totalDays;
    const durB = b.totalDays;
    return durB - durA;
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

  const parsed = resourceDateEvents
    .map((evt) => ({
      event: evt,
      start: parseISODateTime(evt.start),
      end: parseISODateTime(evt.end),
    }))
    .filter((p): p is { event: CalendarEvent; start: Date; end: Date } => p.start != null && p.end != null);

  parsed.sort((a, b) => a.start.getTime() - b.start.getTime());

  const overlapping: CalendarEvent[] = [];
  const active: { event: CalendarEvent; end: Date }[] = [];

  for (const item of parsed) {
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].end <= item.start) {
        active.splice(i, 1);
      }
    }

    if (active.length > 0) {
      if (!overlapping.includes(item.event)) {
        overlapping.push(item.event);
      }
      for (const a of active) {
        if (!overlapping.includes(a.event)) {
          overlapping.push(a.event);
        }
      }
    }

    active.push({ event: item.event, end: item.end });
  }

  if (overlapping.length === 0) return undefined;

  return {
    resourceId,
    date,
    overlappingEvents: overlapping,
  };
}

function extractDatePart(isoStr: string): string {
  return isoStr.split('T')[0] ?? isoStr;
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


