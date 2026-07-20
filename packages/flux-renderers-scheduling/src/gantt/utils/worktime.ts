export interface WorkCalendar {
  isWorkingDay(date: Date): boolean;
  addWorkDays(from: Date, days: number): Date;
  subtractWorkDays(from: Date, days: number): Date;
  countWorkDays(from: Date, to: Date): number;
  getWorkMinutes(date: Date): number;
}

export interface WorkCalendarConfig {
  weekHours?: Record<number, number>;
  holidays?: string[];
  extraWorkDays?: string[];
}

export const DEFAULT_WEEK_HOURS: Record<number, number> = {
  0: 0,
  1: 8,
  2: 8,
  3: 8,
  4: 8,
  5: 8,
  6: 0,
};

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export class DefaultWorkCalendar implements WorkCalendar {
  private weekHours: Record<number, number>;
  private holidays: Set<string>;
  private extraWorkDays: Set<string>;

  constructor(config?: WorkCalendarConfig) {
    this.weekHours = config?.weekHours ?? { ...DEFAULT_WEEK_HOURS };
    this.holidays = new Set(config?.holidays ?? []);
    this.extraWorkDays = new Set(config?.extraWorkDays ?? []);
  }

  isWorkingDay(date: Date): boolean {
    const key = toDateKey(date);
    if (this.extraWorkDays.has(key)) return true;
    if (this.holidays.has(key)) return false;
    const dayOfWeek = date.getDay();
    return (this.weekHours[dayOfWeek] ?? 0) > 0;
  }

  addWorkDays(from: Date, days: number): Date {
    const result = new Date(from);
    let remaining = days;
    while (remaining > 0) {
      result.setDate(result.getDate() + 1);
      if (this.isWorkingDay(result)) {
        remaining--;
      }
    }
    return result;
  }

  subtractWorkDays(from: Date, days: number): Date {
    const result = new Date(from);
    let remaining = days;
    while (remaining > 0) {
      result.setDate(result.getDate() - 1);
      if (this.isWorkingDay(result)) {
        remaining--;
      }
    }
    return result;
  }

  countWorkDays(from: Date, to: Date): number {
    let count = 0;
    const cursor = new Date(from);
    const targetMs = to.getTime();
    const direction = targetMs >= cursor.getTime() ? 1 : -1;

    while (direction === 1 ? cursor.getTime() <= targetMs : cursor.getTime() >= targetMs) {
      if (this.isWorkingDay(cursor)) {
        count++;
      }
      cursor.setDate(cursor.getDate() + direction);
    }
    return count;
  }

  getWorkMinutes(date: Date): number {
    const dayOfWeek = date.getDay();
    return (this.weekHours[dayOfWeek] ?? 0) * 60;
  }
}

export class CalendarManager {
  private calendars: Map<string, WorkCalendar>;
  private globalCalendarId: string | null;

  constructor(globalCalendarId?: string) {
    this.calendars = new Map();
    this.globalCalendarId = globalCalendarId ?? null;
  }

  registerCalendar(id: string, calendar: WorkCalendar): void {
    this.calendars.set(id, calendar);
  }

  getCalendar(calendarId?: string): WorkCalendar | null {
    if (calendarId && this.calendars.has(calendarId)) {
      return this.calendars.get(calendarId)!;
    }
    if (this.globalCalendarId && this.calendars.has(this.globalCalendarId)) {
      return this.calendars.get(this.globalCalendarId)!;
    }
    return null;
  }

  resolveCalendar(taskCalendarId?: string, resourceCalendarId?: string): WorkCalendar | null {
    if (resourceCalendarId && this.calendars.has(resourceCalendarId)) {
      return this.calendars.get(resourceCalendarId)!;
    }
    if (taskCalendarId && this.calendars.has(taskCalendarId)) {
      return this.calendars.get(taskCalendarId)!;
    }
    if (this.globalCalendarId && this.calendars.has(this.globalCalendarId)) {
      return this.calendars.get(this.globalCalendarId)!;
    }
    return null;
  }

  getGlobalCalendarId(): string | null {
    return this.globalCalendarId;
  }
}
