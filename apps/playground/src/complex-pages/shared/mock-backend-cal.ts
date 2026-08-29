/**
 * Cal.com replica mock data + helpers (P3a reads; P3b write surface + session
 * state). Owns the full `/r/Cal__*` fetcher surface so `showcase-env.ts` stays
 * under the 700-line gate. Datasets are deterministic (index arithmetic only):
 * duration tiers 15/30/45/60, slots per date × duration with
 * morning/afternoon/evening grouping plus almost-full/expired samples; session
 * state (pointer, guest list, bookings) lives in the branch factory closure.
 * All copy is original self-authored Chinese.
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
  /** Stable cross-page id: `<date>_<duration>_<time24>`. */
  slotId: string;
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

/** Seed guest visible on the confirm page; appends rotate through the pool. */
const CAL_GUEST_SEED = ['lin.zhiqing@flux.demo'];
const CAL_GUEST_POOL = ['zhou.yutong@flux.demo', 'gao.meng@flux.demo', 'chen.han@flux.demo'];
export const CAL_GUEST_LIMIT = 30;

export function calSlotId(date: string, duration: number, time24: string): string {
  return `${date}_${duration}_${time24}`;
}

export function calParseSlotId(slotId: string): { date: string; duration: number; time24: string } | null {
  const parts = slotId.split('_');
  if (parts.length !== 3) return null;
  const duration = Number(parts[1]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parts[0]) || !Number.isFinite(duration) || !/^\d{2}:\d{2}$/.test(parts[2])) {
    return null;
  }
  return { date: parts[0], duration, time24: parts[2] };
}

/** `10:00` + 30 → `10:00 – 10:30` (24h end derived from the duration tier). */
export function calTimeRange(time24: string, duration: number): string {
  const [hour, minute] = time24.split(':').map(Number);
  const total = hour * 60 + minute + duration;
  const endHour = Math.floor(total / 60) % 24;
  const endMinute = total % 60;
  return `${time24} – ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
}

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

/** Static fallback event meta; the id-miss path returns a placeholder record. */
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
 * Deterministic slot dataset for one date × duration. Availability derives
 * from the date checksum: some dates lose slots, hash % 7 === 3 dates return
 * zero slots (cal-slots-miss). `almost-full`/`expired`/`selected` samples sit
 * on the default date so the three-state form stays assertable in e2e.
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
          slotId: calSlotId(date, duration, time24),
        });
      }
      // Expired sample: last surviving morning slot of the default date
      // (post-trim); selected sample: the 10:00 slot at default date × 30min
      // (matching event.preview "10:00 – 10:30").
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

export type CalBookingStatus = 'confirmed' | 'pending' | 'cancelled';

/** Session selection pointer: the slot a visitor clicked on the booking page. */
export interface CalSlotPointer {
  slotId: string;
  date: string;
  duration: number;
  timezone: string;
  time: string;
  time24: string;
  period: CalSlotPeriod;
  state: CalSlotState;
}

/** Persisted booking; observable across pages within one session. */
export interface CalBookingRecord {
  id: string;
  status: CalBookingStatus;
  eventTitle: string;
  hostName: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  guests: string[];
  slot: CalSlotPointer;
  dateText: string;
  timeText: string;
  durationText: string;
  timezoneLabel: string;
  reason?: string;
  createdAt: string;
}

function toPointer(slot: CalSlot, date: string, duration: number, timezone: string): CalSlotPointer {
  return {
    slotId: slot.slotId, date, duration, timezone,
    time: slot.time, time24: slot.time24, period: slot.period, state: slot.state,
  };
}

/** Fallback draft for direct visits: mirrors `event.preview` (Sep 3, 10:00, 30min). */
function fallbackPointer(event: CalEventMeta): CalSlotPointer {
  const duration = event.defaultDuration;
  return {
    slotId: calSlotId(CAL_DEFAULT_DATE, duration, '10:00'),
    date: CAL_DEFAULT_DATE, duration, timezone: CAL_DEFAULT_TIMEZONE,
    time: to12h('10:00'), time24: '10:00', period: 'morning', state: 'available',
  };
}

function pointerDraft(event: CalEventMeta, pointer: CalSlotPointer | null, guests: string[]) {
  const slot = pointer ?? fallbackPointer(event);
  return {
    active: pointer !== null,
    ...slot,
    dateText: calDateText(slot.date),
    durationKey: String(slot.duration),
    durationText: CAL_DURATION_LABELS[slot.duration] ?? `${slot.duration} 分钟`,
    timeText: calTimeRange(slot.time24, slot.duration),
    timezoneLabel: CAL_TIMEZONE_OPTIONS.find((o) => o.value === slot.timezone)?.label ?? CAL_TIMEZONE_LABEL,
    guests: [...guests],
    eventTitle: event.title,
    hostName: event.hostName,
  };
}

/**
 * Full `/r/Cal__*` fetcher branch (P3a reads; P3b writes). Session state
 * (pointer, guest list, bookings) lives in the factory closure so it stays
 * observable across pages within one session. Write contracts: `Cal__selectSlot`
 * (post) records the pointer, unmatched id → `status:1` (cal-select-miss);
 * `Cal__selectedSlot` (get) returns the pointer draft or the inactive fallback
 * sample (direct-visit compatible); `Cal__book` (post) persists a
 * `CalBookingRecord`, expired slot → `status:1` (cal-book-expired);
 * `Cal__cancelBooking` (post) flips status (cal-cancel-miss on unknown id);
 * `Cal__addGuest`/`Cal__removeGuest` (post) mutate the session guest list (I6,
 * limit 30); `Cal__shareLink` (get) is the I11 copy-link carrier;
 * `Cal__slots` (get) is pointer-aware.
 */
export function createCalFetcherBranch(event: CalEventMeta, clone: <T>(value: T) => T) {
  let pointer: CalSlotPointer | null = null;
  let guests: string[] = [...CAL_GUEST_SEED];
  const bookings: CalBookingRecord[] = [];
  let bookingSeq = 0;

  function findSlot(slotId: string): { slot: CalSlot; date: string; duration: number } | null {
    const parsed = calParseSlotId(slotId);
    if (!parsed) return null;
    const payload = createCalSlots(parsed.date, parsed.duration, CAL_DEFAULT_TIMEZONE);
    for (const group of payload.groups) {
      const slot = group.slots.find((s) => s.time24 === parsed.time24);
      if (slot) return { slot, date: parsed.date, duration: parsed.duration };
    }
    return null;
  }

  function handleCalBranch<T>(input: CalFetcherBranchInput): { status: number; data: T } | null {
    const { url, method, params, body } = input;
    if (!url.includes('/r/Cal__')) return null;
    // Opt-in e2e observation hooks (mirror mock-backend-antdpro): specs pre-create window.__calEndpointCalls / window.__calTestHooks via addInitScript; production never sets them, so both stay no-ops.
    const counters = (globalThis as { __calEndpointCalls?: Record<string, number> }).__calEndpointCalls;
    const counterName = counters ? url.slice(url.indexOf('Cal__')).split('?')[0] : '';
    if (counters) counters[counterName] = (counters[counterName] ?? 0) + 1;
    const normalizedMethod = method.toLowerCase();
    const qs = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams();
    const read = (key: string): string | undefined => {
      const value = params[key] ?? body[key] ?? qs.get(key);
      return value === undefined || value === null ? undefined : String(value);
    };

    if (normalizedMethod === 'post') {
      if (url.includes('/r/Cal__selectSlot')) {
        const slotId = read('slotId') ?? '';
        const matched = slotId ? findSlot(slotId) : null;
        if (!matched) {
          return { status: 1, data: clone({ ok: false, error: 'slot not found' }) as T };
        }
        pointer = toPointer(
          matched.slot,
          matched.date,
          matched.duration,
          read('timezone') ?? CAL_DEFAULT_TIMEZONE,
        );
        return { status: 0, data: clone({ ok: true, slotId, state: pointer.state }) as T };
      }
      if (url.includes('/r/Cal__book')) {
        const slot = pointer ?? fallbackPointer(event);
        if (slot.state === 'expired') {
          return { status: 1, data: clone({ ok: false, error: 'slot-expired' }) as T };
        }
        if (!read('name') || !read('email')) {
          return { status: 1, data: clone({ ok: false, error: 'missing required fields' }) as T };
        }
        bookingSeq += 1;
        const record: CalBookingRecord = {
          id: `BK${String(bookingSeq).padStart(3, '0')}`,
          status: body.requiresConfirmation === true ? 'pending' : 'confirmed',
          eventTitle: event.title,
          hostName: event.hostName,
          name: String(body.name),
          email: String(body.email),
          phone: typeof body.phone === 'string' ? body.phone : undefined,
          notes: typeof body.notes === 'string' ? body.notes : undefined,
          guests: [...guests],
          slot: { ...slot },
          dateText: calDateText(slot.date),
          timeText: calTimeRange(slot.time24, slot.duration),
          durationText: CAL_DURATION_LABELS[slot.duration] ?? `${slot.duration} 分钟`,
          timezoneLabel: CAL_TIMEZONE_OPTIONS.find((o) => o.value === slot.timezone)?.label ?? CAL_TIMEZONE_LABEL,
          createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        };
        bookings.push(record);
        return { status: 0, data: clone({ ok: true, id: record.id, status: record.status }) as T };
      }
      if (url.includes('/r/Cal__cancelBooking')) {
        const id = read('id') ?? bookings[bookings.length - 1]?.id ?? '';
        const target = bookings.find((b) => b.id === id);
        if (!target) {
          return { status: 1, data: clone({ ok: false, error: 'booking not found' }) as T };
        }
        target.status = 'cancelled';
        if (typeof body.reason === 'string' && body.reason) target.reason = body.reason;
        return { status: 0, data: clone({ ok: true, id: target.id, status: target.status }) as T };
      }
      if (url.includes('/r/Cal__addGuest')) {
        if (guests.length >= CAL_GUEST_LIMIT) {
          return { status: 1, data: clone({ ok: false, error: 'guest limit reached' }) as T };
        }
        const next =
          CAL_GUEST_POOL.find((candidate) => !guests.includes(candidate)) ??
          `guest${guests.length + 1}@flux.demo`;
        guests = [...guests, next];
        return { status: 0, data: clone({ ok: true, added: next, guests: [...guests] }) as T };
      }
      if (url.includes('/r/Cal__removeGuest')) {
        const index = Number(body.index);
        if (!Number.isInteger(index) || index < 0 || index >= guests.length) {
          return { status: 1, data: clone({ ok: false, error: 'guest index out of range' }) as T };
        }
        guests = guests.filter((_, i) => i !== index);
        return { status: 0, data: clone({ ok: true, guests: [...guests] }) as T };
      }
      return null;
    }

    if (normalizedMethod !== 'get') {
      return null;
    }
    if (url.includes('/r/Cal__event')) {
      const id = read('id') ?? event.id;
      const matched = id === event.id;
      const record = matched ? event : { ...event, id, title: '预约活动（占位）' };
      return { status: 0, data: clone(record) as T };
    }
    if (url.includes('/r/Cal__selectedSlot')) {
      return { status: 0, data: clone(pointerDraft(event, pointer, guests)) as T };
    }
    if (url.includes('/r/Cal__latestBooking')) {
      const latest = bookings.length > 0 ? bookings[bookings.length - 1] : null;
      return { status: 0, data: clone(latest) as T };
    }
    if (url.includes('/r/Cal__shareLink')) {
      return { status: 0, data: clone({ ok: true, url: '#/complex-pages/cal-booking' }) as T };
    }
    if (url.includes('/r/Cal__slots')) {
      const date = read('date') ?? CAL_DEFAULT_DATE;
      const duration = Number(read('duration') ?? event.defaultDuration) || event.defaultDuration;
      const timezone = read('timezone') ?? event.timezone;
      const payload = createCalSlots(date, duration, timezone);
      if (pointer && pointer.date === date && pointer.duration === duration) {
        for (const group of payload.groups) {
          for (const slot of group.slots) {
            if (slot.time24 === pointer.time24 && slot.state !== 'expired') slot.selected = true;
            else delete slot.selected;
          }
        }
      }
      return { status: 0, data: clone(payload) as T };
    }
    return null;
  }

  // Opt-in e2e hook: force-select via the exact endpoint path — reaches the expired-pointer branch (cal-book-expired) that the disabled UI button cannot (P3b Phase 3 I9).
  const hooks = (globalThis as { __calTestHooks?: { selectSlot?: (slotId: string) => void } })
    .__calTestHooks;
  if (hooks) {
    hooks.selectSlot = (slotId) =>
      handleCalBranch({
        url: '/r/Cal__selectSlot',
        method: 'post',
        params: {},
        body: { slotId },
      });
  }
  return handleCalBranch;
}
