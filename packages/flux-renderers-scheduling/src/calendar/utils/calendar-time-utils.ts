import type { CalendarEvent } from '../../schemas.js';
import type { PositionedEvent } from '../calendar.types.js';

export interface TimePointInput {
  date: Date;
  dayStartHour: number;
  dayEndHour: number;
}

export function timePointToPercentage(input: TimePointInput): number {
  const { date, dayStartHour, dayEndHour } = input;
  const totalMinutes = (dayEndHour - dayStartHour) * 60;
  if (totalMinutes <= 0) return 0;

  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const offsetMinutes = minutes - dayStartHour * 60;

  if (offsetMinutes < 0) return 0;
  if (offsetMinutes > totalMinutes) return 100;

  return (offsetMinutes / totalMinutes) * 100;
}

export interface VerticalRange {
  top: number;
  height: number;
}

function parseUTCDate(isoStr: string): Date {
  const dateMatch = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))/);
  if (dateMatch) {
    return new Date(Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), Number(dateMatch[4]), Number(dateMatch[5])));
  }
  const dateOnlyMatch = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnlyMatch) {
    return new Date(Date.UTC(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3])));
  }
  return new Date(NaN);
}

export function eventToVerticalRange(
  event: CalendarEvent,
  dayStartHour: number,
  dayEndHour: number,
  referenceDay?: Date,
): VerticalRange {
  const eventStart = parseUTCDate(event.start);
  const eventEnd = parseUTCDate(event.end);

  const dayStart = referenceDay
    ? new Date(Date.UTC(referenceDay.getUTCFullYear(), referenceDay.getUTCMonth(), referenceDay.getUTCDate(), dayStartHour))
    : new Date(Date.UTC(eventStart.getUTCFullYear(), eventStart.getUTCMonth(), eventStart.getUTCDate(), dayStartHour));
  const dayEnd = referenceDay
    ? new Date(Date.UTC(referenceDay.getUTCFullYear(), referenceDay.getUTCMonth(), referenceDay.getUTCDate(), dayEndHour))
    : new Date(Date.UTC(eventStart.getUTCFullYear(), eventStart.getUTCMonth(), eventStart.getUTCDate(), dayEndHour));

  const effectiveStart = eventStart < dayStart ? dayStart : eventStart;
  const effectiveEnd = eventEnd > dayEnd ? dayEnd : eventEnd;

  const totalMinutes = (dayEndHour - dayStartHour) * 60;
  if (totalMinutes <= 0) return { top: 0, height: 0 };

  const startMinutes = effectiveStart.getUTCHours() * 60 + effectiveStart.getUTCMinutes();
  const endMinutes = effectiveEnd.getUTCHours() * 60 + effectiveEnd.getUTCMinutes();

  const offsetMinutes = startMinutes - dayStartHour * 60;
  const durationMinutes = endMinutes - startMinutes;

  return {
    top: Math.max(0, (offsetMinutes / totalMinutes) * 100),
    height: Math.max(0, (durationMinutes / totalMinutes) * 100),
  };
}

export interface ConcurrentWidthAllocation {
  positionedEvents: PositionedEvent[];
}

export function allocateConcurrentWidths(
  events: CalendarEvent[],
  dayStartHour: number,
  dayEndHour: number,
  _maxConcurrent: number = 4,
): PositionedEvent[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => {
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });

  const positioned: PositionedEvent[] = [];

  const columns: CalendarEvent[][] = [];

  for (const event of sorted) {
    let placed = false;
    const eventIsDateOnly = !event.start.includes('T') && !event.end.includes('T');
    for (let col = 0; col < columns.length; col++) {
      const lastInCol = columns[col][columns[col].length - 1];
      const lastIsDateOnly = !lastInCol.end.includes('T') && !lastInCol.start.includes('T');
      if (eventIsDateOnly || lastIsDateOnly) {
        continue;
      }
      const lastEnd = new Date(lastInCol.end);
      const eventStart = new Date(event.start);
      if (lastEnd <= eventStart) {
        columns[col].push(event);
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([event]);
    }
  }

  const maxUsed = Math.max(columns.length, 1);
  const allocatedWidth = 100 / maxUsed;

  for (let col = 0; col < columns.length; col++) {
    for (const event of columns[col]) {
      const { top, height } = eventToVerticalRange(event, dayStartHour, dayEndHour);
      positioned.push({
        event,
        left: col * allocatedWidth,
        width: allocatedWidth,
        top,
        height,
        eventId: event.id,
        concurrentIndex: col,
        maxConcurrent: maxUsed,
      });
    }
  }

  return positioned;
}
