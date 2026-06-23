/**
 * Shared date底层 for the W2b date family (input-date / input-datetime /
 * input-time / date-range).
 *
 * Built on native `Date` + `Intl` only — no date-fns/dayjs/luxon. Provides a
 * small token format/parse system (YYYY/YY/MM/DD/HH/mm/ss), min/max constraint
 * checks, UTC storage round-trip, valueFormat↔displayFormat conversion and
 * range normalization. All parse failures degrade to `undefined` (never throw),
 * so the caller can surface them as validation rather than as crashes.
 */

export type RangeKind = 'date' | 'datetime' | 'time';

export interface DateOptions {
  /** Operate on UTC components instead of local components. */
  utc?: boolean;
}

export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_DATETIME_FORMAT = 'YYYY-MM-DD HH:mm';
export const DEFAULT_DATETIME_SECONDS_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const DEFAULT_TIME_FORMAT = 'HH:mm';
export const DEFAULT_TIME_SECONDS_FORMAT = 'HH:mm:ss';

/**
 * Token definitions in priority order (longest first so `YYYY` wins over `YY`).
 * Order matters for tokenization AND for building parse capture maps.
 */
const TOKEN_DEFS = ['YYYY', 'YY', 'MM', 'DD', 'HH', 'mm', 'ss'] as const;
type TokenDef = (typeof TOKEN_DEFS)[number];

const TOKEN_PATTERNS: Record<TokenDef, string> = {
  YYYY: '(\\d{4})',
  YY: '(\\d{2})',
  MM: '(\\d{1,2})',
  DD: '(\\d{1,2})',
  HH: '(\\d{1,2})',
  mm: '(\\d{1,2})',
  ss: '(\\d{1,2})',
};

type FormatSegment = { kind: 'literal'; value: string } | { kind: 'token'; token: TokenDef };

function tokenizeFormat(format: string): FormatSegment[] {
  const segments: FormatSegment[] = [];
  let i = 0;
  while (i < format.length) {
    let matched: TokenDef | undefined;
    for (const token of TOKEN_DEFS) {
      if (format.startsWith(token, i)) {
        matched = token;
        break;
      }
    }
    if (matched) {
      segments.push({ kind: 'token', token: matched });
      i += matched.length;
    } else {
      segments.push({ kind: 'literal', value: format[i] });
      i += 1;
    }
  }
  return segments;
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function getDateComponents(date: Date, utc: boolean) {
  return utc
    ? {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds(),
      }
    : {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds(),
      };
}

/**
 * Format a Date into a token-based format string.
 * Returns `undefined` when the date is invalid.
 */
export function formatDate(
  date: Date | undefined,
  format: string,
  options?: DateOptions,
): string | undefined {
  if (!date || Number.isNaN(date.getTime())) {
    return undefined;
  }
  const utc = options?.utc === true;
  const parts = getDateComponents(date, utc);
  const segments = tokenizeFormat(format);
  let out = '';
  for (const segment of segments) {
    if (segment.kind === 'literal') {
      out += segment.value;
      continue;
    }
    switch (segment.token) {
      case 'YYYY':
        out += String(parts.year).padStart(4, '0');
        break;
      case 'YY':
        out += pad2(parts.year % 100);
        break;
      case 'MM':
        out += pad2(parts.month);
        break;
      case 'DD':
        out += pad2(parts.day);
        break;
      case 'HH':
        out += pad2(parts.hour);
        break;
      case 'mm':
        out += pad2(parts.minute);
        break;
      case 'ss':
        out += pad2(parts.second);
        break;
    }
  }
  return out;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse a token-formatted string into a Date. Returns `undefined` when the
 * string does not match the format or the resolved date is invalid (never
 * throws). When the format omits a component, defaults are used (month/day=1,
 * time=0).
 */
export function parseDate(
  value: string | undefined,
  format: string,
  options?: DateOptions,
): Date | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const str = String(value).trim();
  const segments = tokenizeFormat(format);
  let regex = '^';
  const captureTokens: TokenDef[] = [];
  for (const segment of segments) {
    if (segment.kind === 'literal') {
      regex += escapeRegex(segment.value);
    } else {
      regex += TOKEN_PATTERNS[segment.token];
      captureTokens.push(segment.token);
    }
  }
  regex += '$';

  const match = new RegExp(regex).exec(str);
  if (!match) {
    return undefined;
  }

  let year = 1970;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;
  let second = 0;

  captureTokens.forEach((token, index) => {
    const raw = Number(match[index + 1]);
    if (Number.isNaN(raw)) {
      return;
    }
    switch (token) {
      case 'YYYY':
        year = raw;
        break;
      case 'YY':
        year = raw >= 69 ? 1900 + raw : 2000 + raw;
        break;
      case 'MM':
        month = raw;
        break;
      case 'DD':
        day = raw;
        break;
      case 'HH':
        hour = raw;
        break;
      case 'mm':
        minute = raw;
        break;
      case 'ss':
        second = raw;
        break;
    }
  });

  if (month < 1 || month > 12) {
    return undefined;
  }
  if (day < 1 || day > 31) {
    return undefined;
  }
  if (hour > 23 || minute > 59 || second > 59) {
    return undefined;
  }

  const date = options?.utc
    ? new Date(Date.UTC(year, month - 1, day, hour, minute, second))
    : new Date(year, month - 1, day, hour, minute, second);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  // Verify calendar validity (e.g. day 31 of a 30-day month rolls over).
  const verify = getDateComponents(date, options?.utc === true);
  if (verify.month !== month || verify.day !== day || verify.year !== year) {
    return undefined;
  }
  return date;
}

/**
 * Round-trip convert a stored value between two token formats
 * (valueFormat ↔ displayFormat).
 */
export function convertValueFormat(
  value: string | undefined,
  fromFormat: string,
  toFormat: string,
  options?: DateOptions,
): string | undefined {
  const date = parseDate(value, fromFormat, options);
  if (!date) {
    return undefined;
  }
  return formatDate(date, toFormat, options);
}

/**
 * Returns true when `date` falls within [min, max] (inclusive). `min`/`max`
 * may be omitted to make the range open on that side. Invalid bounds are
 * ignored.
 */
export function isWithinRange(
  date: Date | undefined,
  min: Date | undefined,
  max: Date | undefined,
): boolean {
  if (!date || Number.isNaN(date.getTime())) {
    return false;
  }
  const time = date.getTime();
  if (min && !Number.isNaN(min.getTime()) && time < min.getTime()) {
    return false;
  }
  if (max && !Number.isNaN(max.getTime()) && time > max.getTime()) {
    return false;
  }
  return true;
}

/** Serialize a Date to an ISO UTC string (UTC storage form). */
export function toUtc(value: Date | undefined): string | undefined {
  if (!value || Number.isNaN(value.getTime())) {
    return undefined;
  }
  return value.toISOString();
}

/** Parse an ISO UTC string back into a Date. Returns `undefined` if invalid. */
export function fromUtc(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Numeric comparison of two dates: -1 / 0 / 1. Invalid dates sort last. */
export function compareDates(a: Date | undefined, b: Date | undefined): number {
  const at = a && !Number.isNaN(a.getTime()) ? a.getTime() : Number.POSITIVE_INFINITY;
  const bt = b && !Number.isNaN(b.getTime()) ? b.getTime() : Number.POSITIVE_INFINITY;
  if (at < bt) return -1;
  if (at > bt) return 1;
  return 0;
}

export interface NormalizedRange {
  start: string | undefined;
  end: string | undefined;
  swapped: boolean;
}

/**
 * Normalize a range expressed as two token-formatted strings. When both ends
 * parse and `start > end`, the ends are swapped so the stored value is always
 * well-formed. Unparseable ends are returned unchanged (caller decides whether
 * to reject).
 */
export function normalizeRange(
  start: string | undefined,
  end: string | undefined,
  format: string,
  options?: DateOptions,
): NormalizedRange {
  const startDate = parseDate(start, format, options);
  const endDate = parseDate(end, format, options);
  if (startDate && endDate && compareDates(startDate, endDate) > 0) {
    const startOut = formatDate(endDate, format, options);
    const endOut = formatDate(startDate, format, options);
    return { start: startOut, end: endOut, swapped: true };
  }
  return { start, end, swapped: false };
}

export interface ParsedRange {
  start: Date | undefined;
  end: Date | undefined;
}

/** Parse a delimited range string (e.g. "2024-01-01,2024-02-01") into dates. */
export function parseDateRange(
  value: string | undefined,
  delimiter: string,
  format: string,
  options?: DateOptions,
): ParsedRange {
  if (!value) {
    return { start: undefined, end: undefined };
  }
  const parts = value.split(delimiter);
  return {
    start: parseDate(parts[0], format, options),
    end: parseDate(parts[1], format, options),
  };
}

/** Join two token-formatted range ends back into a single delimited string. */
export function joinDateRange(
  start: string | undefined,
  end: string | undefined,
  delimiter: string,
): string {
  return [start ?? '', end ?? ''].join(delimiter);
}

/** Default valueFormat for a given range kind. */
export function defaultFormatForRangeKind(kind: RangeKind): string {
  switch (kind) {
    case 'datetime':
      return DEFAULT_DATETIME_FORMAT;
    case 'time':
      return DEFAULT_TIME_FORMAT;
    case 'date':
    default:
      return DEFAULT_DATE_FORMAT;
  }
}

/**
 * Convert a calendar (local wall-clock) Date into the storage representation.
 * When `utc` is true, the local wall-clock components are re-serialized as a UTC
 * instant so that `formatDate(storage, fmt, { utc: true })` yields the same
 * calendar day/time the user picked — regardless of the host timezone. This
 * bridges react-day-picker (which always emits local-midnight Dates) with UTC
 * storage without day-shift drift.
 */
export function toStorageDate(day: Date | undefined, utc: boolean): Date | undefined {
  if (!day || Number.isNaN(day.getTime())) {
    return undefined;
  }
  if (!utc) {
    return new Date(day);
  }
  return new Date(
    Date.UTC(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      day.getHours(),
      day.getMinutes(),
      day.getSeconds(),
    ),
  );
}

/**
 * Inverse of {@link toStorageDate}: convert a parsed storage Date (whose UTC
 * components are the wall-clock value when `utc` is true) back into a local
 * wall-clock Date for the calendar.
 */
export function toCalendarDate(parsed: Date | undefined, utc: boolean): Date | undefined {
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  if (!utc) {
    return parsed;
  }
  return new Date(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
    parsed.getUTCHours(),
    parsed.getUTCMinutes(),
    parsed.getUTCSeconds(),
  );
}
