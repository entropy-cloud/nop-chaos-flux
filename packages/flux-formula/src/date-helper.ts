function toDate(input: string | number | Date | null | undefined): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : new Date(input.getTime());
  }

  if (input == null) {
    return null;
  }

  const value = new Date(input);
  return Number.isNaN(value.getTime()) ? null : value;
}

function getUtcParts(input: Date) {
  return {
    year: input.getUTCFullYear(),
    month: input.getUTCMonth() + 1,
    day: input.getUTCDate(),
    hours: input.getUTCHours(),
    minutes: input.getUTCMinutes(),
    seconds: input.getUTCSeconds(),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatNamedDate(
  input: Date,
  format: 'iso-date' | 'iso-datetime' | 'date' | 'datetime',
): string {
  const parts = getUtcParts(input);
  const datePart = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  const timePart = `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;

  switch (format) {
    case 'iso-date':
    case 'date':
      return datePart;
    case 'iso-datetime':
      return `${datePart}T${timePart}Z`;
    case 'datetime':
      return `${datePart} ${timePart}`;
  }
}

function normalizeDate(input: string | number | Date): Date | null {
  return toDate(input);
}

function cloneDate(input: Date | null): Date | null {
  return input ? new Date(input.getTime()) : null;
}

function addMonths(date: Date, count: number): Date {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + Number(count || 0));
  return result;
}

function addYears(date: Date, count: number): Date {
  const result = new Date(date.getTime());
  result.setUTCFullYear(result.getUTCFullYear() + Number(count || 0));
  return result;
}

function monthDiff(a: Date, b: Date): number {
  return (a.getUTCFullYear() - b.getUTCFullYear()) * 12 + (a.getUTCMonth() - b.getUTCMonth());
}

export const dateHelper = {
  now(): Date {
    return new Date();
  },
  today(): Date {
    const value = new Date();
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  },
  parse(input: string | number | Date): Date | null {
    return normalizeDate(input);
  },
  format(
    input: string | number | Date,
    format: 'iso-date' | 'iso-datetime' | 'date' | 'datetime',
  ): string {
    const value = normalizeDate(input);
    return value ? formatNamedDate(value, format) : '';
  },
  year(input: string | number | Date): number {
    return normalizeDate(input)?.getUTCFullYear() ?? Number.NaN;
  },
  month(input: string | number | Date): number {
    const value = normalizeDate(input);
    return value ? value.getUTCMonth() + 1 : Number.NaN;
  },
  day(input: string | number | Date): number {
    return normalizeDate(input)?.getUTCDate() ?? Number.NaN;
  },
  hours(input: string | number | Date): number {
    return normalizeDate(input)?.getUTCHours() ?? Number.NaN;
  },
  minutes(input: string | number | Date): number {
    return normalizeDate(input)?.getUTCMinutes() ?? Number.NaN;
  },
  seconds(input: string | number | Date): number {
    return normalizeDate(input)?.getUTCSeconds() ?? Number.NaN;
  },
  addDays(input: string | number | Date, count: number): Date | null {
    const value = normalizeDate(input);
    if (!value) {
      return null;
    }

    const result = cloneDate(value);
    result?.setUTCDate(result.getUTCDate() + Number(count || 0));
    return result;
  },
  addMonths(input: string | number | Date, count: number): Date | null {
    const value = normalizeDate(input);
    return value ? addMonths(value, count) : null;
  },
  addYears(input: string | number | Date, count: number): Date | null {
    const value = normalizeDate(input);
    return value ? addYears(value, count) : null;
  },
  diff(
    left: string | number | Date,
    right: string | number | Date,
    unit: 'day' | 'month' | 'year',
  ): number {
    const a = normalizeDate(left);
    const b = normalizeDate(right);

    if (!a || !b) {
      return Number.NaN;
    }

    switch (unit) {
      case 'day':
        return Math.trunc((a.getTime() - b.getTime()) / 86400000);
      case 'month':
        return monthDiff(a, b);
      case 'year':
        return Math.trunc(monthDiff(a, b) / 12);
    }
  },
};
