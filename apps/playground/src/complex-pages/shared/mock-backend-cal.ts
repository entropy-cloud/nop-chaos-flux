/**
 * Cal.com replica mock data + helpers (plan 2026-08-29-1413-2 P3a).
 *
 * Owns the `/r/Cal__*` get-only read surface so `showcase-env.ts` stays under
 * the 700-line gate (createAntdProFetcherBranch precedent). Datasets are
 * deterministic (index arithmetic only) so e2e runs are stable and
 * structurally real: duration tiers 15/30/45/60, slots generated per
 * date × duration with morning/afternoon/evening grouping plus
 * almost-full/expired state samples, and the confirm-page summary + booking
 * fields sample.
 *
 * All copy is original self-authored Chinese; no Cal.com sample data.
 */

export type CalSlotState = 'available' | 'almost-full' | 'expired';
export type CalSlotPeriod = 'morning' | 'afternoon' | 'evening';

export interface CalDurationOption {
  minutes: number;
  label: string;
}

export interface CalEventMeta {
  id: string;
  title: string;
  hostName: string;
  hostInitials: string;
  username: string;
  description: string;
  location: string;
  timezone: string;
  timezoneLabel: string;
  durations: number[];
  defaultDuration: number;
  /** Deterministic preview row for the confirm/success static summary. */
  preview: { dateText: string; timeText: string; durationText: string };
  bookingFields: Array<{ name: string; label: string; type: string; required: boolean }>;
}

export interface CalSlot {
  time: string;
  time24: string;
  period: CalSlotPeriod;
  state: CalSlotState;
  stateLabel: string;
  /** Static selection sample: set on the default date × default duration. */
  selected?: boolean;
}

export interface CalSlotGroup {
  key: CalSlotPeriod;
  label: string;
  slots: CalSlot[];
}

export interface CalSlotsPayload {
  date: string;
  dateText: string;
  duration: number;
  durationText: string;
  timezone: string;
  timezoneLabel: string;
  groups: CalSlotGroup[];
  total: number;
}

export const CAL_DURATION_LABELS: Record<number, string> = {
  15: '15 分钟',
  30: '30 分钟',
  45: '45 分钟',
  60: '60 分钟',
};

export const CAL_PERIOD_LABELS: Record<CalSlotPeriod, string> = {
  morning: '上午',
  afternoon: '下午',
  evening: '晚上',
};

export const CAL_SLOT_STATE_LABELS: Record<CalSlotState, string> = {
  available: '可预约',
  'almost-full': '名额将满',
  expired: '已失效',
};

export const CAL_DEFAULT_DATE = '2026-09-03';
export const CAL_DEFAULT_TIMEZONE = 'Asia/Shanghai';
export const CAL_TIMEZONE_LABEL = '上海 (GMT+8)';

const CAL_TIMEZONE_OPTIONS = [
  { label: '上海 (GMT+8)', value: 'Asia/Shanghai' },
  { label: '东京 (GMT+9)', value: 'Asia/Tokyo' },
  { label: '新加坡 (GMT+8)', value: 'Asia/Singapore' },
  { label: '伦敦 (GMT+0)', value: 'Europe/London' },
  { label: '柏林 (GMT+1)', value: 'Europe/Berlin' },
  { label: '纽约 (GMT-5)', value: 'America/New_York' },
  { label: '旧金山 (GMT-8)', value: 'America/Los_Angeles' },
  { label: '悉尼 (GMT+11)', value: 'Australia/Sydney' },
];

export function calTimezoneOptions(): Array<{ label: string; value: string }> {
  return CAL_TIMEZONE_OPTIONS.map((o) => ({ ...o }));
}

/** Stable non-cryptographic checksum of a `YYYY-MM-DD` string. */
export function calDateHash(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i += 1) {
    hash = (hash * 31 + date.charCodeAt(i)) % 997;
  }
  return hash;
}

/**
 * The static fallback event meta. The id-miss path (`cal-event-miss` failure
 * mode) returns this record so the page renders a placeholder instead of
 * crashing; the known id serves the fully-detailed record.
 */
export function createCalEventMeta(): CalEventMeta {
  return {
    id: 'product-discovery',
    title: '产品发现深聊（30 分钟）',
    hostName: '沈亦然',
    hostInitials: '沈',
    username: 'yiran.shen',
    description:
      '面向新客户的首次沟通：我们一起梳理业务目标、现状痛点与优先级，判断产品如何切入最合适。请在备注里提前告知你想重点讨论的方向。',
    location: '线上视频（会前发送链接）',
    timezone: CAL_DEFAULT_TIMEZONE,
    timezoneLabel: CAL_TIMEZONE_LABEL,
    durations: [15, 30, 45, 60],
    defaultDuration: 30,
    preview: {
      dateText: '2026年9月3日 周四',
      timeText: '10:00 – 10:30',
      durationText: CAL_DURATION_LABELS[30],
    },
    bookingFields: [
      { name: 'name', label: '您的姓名', type: 'text', required: true },
      { name: 'email', label: '邮箱', type: 'email', required: true },
      { name: 'phone', label: '联系电话（可选）', type: 'phone', required: false },
      { name: 'notes', label: '备注', type: 'textarea', required: false },
      { name: 'companySize', label: '团队规模', type: 'select', required: true },
      { name: 'focusArea', label: '最想解决的问题', type: 'radio', required: true },
      { name: 'channels', label: '了解我们的渠道', type: 'checkbox-group', required: false },
    ],
  };
}

const MORNING_TIMES = ['09:00', '09:30', '10:00', '10:30', '11:30'];
const AFTERNOON_TIMES = ['13:30', '14:00', '15:00', '16:00', '16:30'];
const EVENING_TIMES = ['18:30', '19:30'];

function to12h(time24: string): string {
  const hour = Number(time24.slice(0, 2));
  const minute = time24.slice(3);
  const suffix = hour < 12 ? '上午' : '下午';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${suffix} ${display}:${minute}`;
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** `2026-09-03` → `2026年9月3日 周四` (UTC-parsed, weekday deterministic). */
export function calDateText(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  const [year, month, day] = date.split('-');
  return `${year}年${Number(month)}月${Number(day)}日 ${WEEKDAY_LABELS[parsed.getUTCDay()]}`;
}

/**
 * Deterministic slot dataset for one date × duration. Slot availability is
 * derived from the date checksum so some dates are fully open, some lose a
 * few slots, and hash % 7 === 3 dates return zero slots (cal-slots-miss
 * failure mode). `almost-full` / `expired` state samples appear on the
 * default date so the three-state form is assertable in e2e.
 */
export function createCalSlots(date: string, duration: number, timezone: string): CalSlotsPayload {
  const hash = calDateHash(date);
  const emptyDay = hash % 7 === 3;
  // Availability windows shrink as the duration grows: each +15min tier drops
  // one more slot per period, so 60min days keep fewer slots than 15min days.
  const trim = Math.max(0, Math.floor(duration / 15) - 1);
  const groups: CalSlotGroup[] = (['morning', 'afternoon', 'evening'] as CalSlotPeriod[]).map(
    (period) => {
      const times =
        period === 'morning' ? MORNING_TIMES : period === 'afternoon' ? AFTERNOON_TIMES : EVENING_TIMES;
      const slots: CalSlot[] = [];
      for (let i = 0; i < times.length; i += 1) {
        if (i >= times.length - trim) continue;
        if ((hash + i * 3) % 11 === 0) continue;
        const time24 = times[i];
        let state: CalSlotState = 'available';
        if (date === CAL_DEFAULT_DATE && duration === 30 && period === 'afternoon' && i === 1) {
          state = 'almost-full';
        }
        slots.push({
          time: to12h(time24),
          time24,
          period,
          state,
          stateLabel: CAL_SLOT_STATE_LABELS[state],
        });
      }
      // The expired sample sits on the last surviving morning slot of the
      // default date (post-trim, so it exists at every duration tier); the
      // selected sample sits on the 10:00 slot of the default date × default
      // duration (matching event.preview "10:00 – 10:30").
      if (date === CAL_DEFAULT_DATE && period === 'morning' && slots.length > 0) {
        const last = slots[slots.length - 1];
        last.state = 'expired';
        last.stateLabel = CAL_SLOT_STATE_LABELS.expired;
        if (duration === 30) {
          const selected = slots.find((s) => s.time24 === '10:00');
          if (selected) selected.selected = true;
        }
      }
      return { key: period, label: CAL_PERIOD_LABELS[period], slots };
    },
  );
  const normalizedGroups = emptyDay ? groups.map((g) => ({ ...g, slots: [] })) : groups;
  return {
    date,
    dateText: calDateText(date),
    duration,
    durationText: CAL_DURATION_LABELS[duration] ?? `${duration} 分钟`,
    timezone,
    timezoneLabel:
      CAL_TIMEZONE_OPTIONS.find((o) => o.value === timezone)?.label ?? CAL_TIMEZONE_LABEL,
    groups: normalizedGroups,
    total: normalizedGroups.reduce((sum, g) => sum + g.slots.length, 0),
  };
}

export interface CalFetcherBranchInput {
  url: string;
  method: string;
  params: Record<string, unknown>;
  body: Record<string, unknown>;
}

/**
 * Full `/r/Cal__*` fetcher branch (plan 2026-08-29-1413-2 P3a; get-only —
 * P3b owns any future write surface). Returns null when the request is not a
 * Cal endpoint or the method is not get. Unknown event ids fall back to the
 * placeholder record instead of a miss so the page never crashes.
 */
export function createCalFetcherBranch(event: CalEventMeta, clone: <T>(value: T) => T) {
  return function handleCalBranch<T>(input: CalFetcherBranchInput): { status: number; data: T } | null {
    const { url, method, params, body } = input;
    if (!url.includes('/r/Cal__')) {
      return null;
    }
    if (method.toLowerCase() !== 'get') {
      return null;
    }
    const qs = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams();
    const read = (key: string): string | undefined => {
      const value = params[key] ?? body[key] ?? qs.get(key);
      return value === undefined || value === null ? undefined : String(value);
    };

    if (url.includes('/r/Cal__event')) {
      const id = read('id') ?? event.id;
      const matched = id === event.id;
      const record = matched ? event : { ...event, id, title: '预约活动（占位）' };
      return { status: 0, data: clone(record) as T };
    }
    if (url.includes('/r/Cal__slots')) {
      const date = read('date') ?? CAL_DEFAULT_DATE;
      const duration = Number(read('duration') ?? event.defaultDuration) || event.defaultDuration;
      const timezone = read('timezone') ?? event.timezone;
      return { status: 0, data: clone(createCalSlots(date, duration, timezone)) as T };
    }
    return null;
  };
}
