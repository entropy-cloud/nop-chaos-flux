import { describe, expect, it } from 'vitest';
import type { ApiRequestContext, SchemaValue } from '@nop-chaos/flux-core';
import bookingSchema from '../page-schemas/cal-booking.json';
import confirmSchema from '../page-schemas/cal-confirm.json';
import successSchema from '../page-schemas/cal-success.json';
import {
  CAL_DEFAULT_DATE,
  CAL_DURATION_LABELS,
  CAL_PERIOD_LABELS,
  CAL_SLOT_STATE_LABELS,
  createCalEventMeta,
  createCalFetcherBranch,
  createCalSlots,
  calDateHash,
  calTimezoneOptions,
} from '../shared/mock-backend-cal';
import { createShowcaseEnv } from '../shared/showcase-env';
import { COMPLEX_PAGE_ENTRIES } from '../complex-pages-model';

describe('Cal mock backend — event meta dataset', () => {
  it('covers the four duration tiers 15/30/45/60 with labels and a default', () => {
    const event = createCalEventMeta();
    expect(event.durations).toEqual([15, 30, 45, 60]);
    for (const minutes of event.durations) {
      expect(CAL_DURATION_LABELS[minutes], `label for ${minutes}min`).toBeTruthy();
    }
    expect(event.defaultDuration).toBe(30);
    expect(event.durations).toContain(event.defaultDuration);
  });

  it('booking fields sample covers text/email/phone/textarea + select/radio/checkbox question types', () => {
    const types = createCalEventMeta().bookingFields.map((f) => f.type);
    expect(types).toContain('text');
    expect(types).toContain('email');
    expect(types).toContain('phone');
    expect(types).toContain('textarea');
    expect(types).toContain('select');
    expect(types).toContain('radio');
    expect(types).toContain('checkbox-group');
    expect(createCalEventMeta().bookingFields.some((f) => f.required)).toBe(true);
    expect(createCalEventMeta().preview.timeText).toMatch(/^\d{2}:\d{2} – \d{2}:\d{2}$/);
  });
});

describe('Cal mock backend — slot generation', () => {
  it('groups slots into morning/afternoon/evening with Chinese labels', () => {
    const payload = createCalSlots(CAL_DEFAULT_DATE, 30, 'Asia/Shanghai');
    expect(payload.groups.map((g) => g.key)).toEqual(['morning', 'afternoon', 'evening']);
    expect(payload.groups.map((g) => g.label)).toEqual([
      CAL_PERIOD_LABELS.morning,
      CAL_PERIOD_LABELS.afternoon,
      CAL_PERIOD_LABELS.evening,
    ]);
    expect(payload.total).toBe(payload.groups.reduce((sum, g) => sum + g.slots.length, 0));
    expect(payload.total).toBeGreaterThan(0);
  });

  it('default date × 30min carries the almost-full and expired state samples', () => {
    const payload = createCalSlots(CAL_DEFAULT_DATE, 30, 'Asia/Shanghai');
    const states = payload.groups.flatMap((g) => g.slots.map((s) => s.state));
    expect(states).toContain('almost-full');
    expect(states).toContain('expired');
    expect(states).toContain('available');
    for (const slot of payload.groups.flatMap((g) => g.slots)) {
      expect(slot.stateLabel).toBe(CAL_SLOT_STATE_LABELS[slot.state]);
      expect(slot.time24).toMatch(/^\d{2}:\d{2}$/);
    }
    const selected = payload.groups.flatMap((g) => g.slots).find((s) => s.selected);
    expect(selected?.time24).toBe('10:00');
  });

  it('cal-slots-miss: hash % 7 === 3 dates return zero slots without error', () => {
    const emptyDate = ['2026-09-01', '2026-09-02', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08'].find(
      (d) => calDateHash(d) % 7 === 3,
    );
    expect(emptyDate).toBeTruthy();
    const payload = createCalSlots(emptyDate!, 30, 'Asia/Shanghai');
    expect(payload.total).toBe(0);
    expect(payload.groups.map((g) => g.slots.length)).toEqual([0, 0, 0]);
  });

  it('dateText renders deterministic Chinese weekday text', () => {
    expect(createCalSlots('2026-09-03', 30, 'Asia/Shanghai').dateText).toBe('2026年9月3日 周四');
  });

  it('slot inventory shrinks as duration grows (availability windows)', () => {
    const d15 = createCalSlots('2026-09-10', 15, 'Asia/Shanghai').total;
    const d60 = createCalSlots('2026-09-10', 60, 'Asia/Shanghai').total;
    expect(d60).toBeLessThanOrEqual(d15);
  });

  it('timezone labels resolve from the option list and fall back sanely', () => {
    const options = calTimezoneOptions();
    expect(options.length).toBeGreaterThanOrEqual(6);
    expect(options.some((o) => o.value === 'Asia/Shanghai')).toBe(true);
    expect(createCalSlots(CAL_DEFAULT_DATE, 30, 'Asia/Tokyo').timezoneLabel).toContain('东京');
    expect(createCalSlots(CAL_DEFAULT_DATE, 30, 'Nowhere/None').timezoneLabel).toBeTruthy();
  });
});

describe('Cal fetcher branch (get-only)', () => {
  const fetchCtx = { scope: null } as unknown as ApiRequestContext;

  it('Cal__event returns the meta record; unknown id returns the fallback record (no crash)', async () => {
    const { env } = createShowcaseEnv();
    const hit = await env.fetcher!<Record<string, unknown>>(
      { url: '/r/Cal__event', method: 'get' },
      fetchCtx,
    );
    expect(hit.status).toBe(0);
    expect((hit.data as Record<string, unknown>).title).toContain('产品发现');
    expect((hit.data as Record<string, unknown>).durations).toEqual([15, 30, 45, 60]);

    const miss = await env.fetcher!<Record<string, unknown>>(
      { url: '/r/Cal__event?id=unknown-event', method: 'get' },
      fetchCtx,
    );
    expect(miss.status).toBe(0);
    expect((miss.data as Record<string, unknown>).title).toContain('占位');
    expect((miss.data as Record<string, unknown>).durations).toEqual([15, 30, 45, 60]);
  });

  it('Cal__slots honors date/duration/timezone query params via fetcher', async () => {
    const { env } = createShowcaseEnv();
    const res = await env.fetcher!<Record<string, unknown>>(
      { url: `/r/Cal__slots?date=${CAL_DEFAULT_DATE}&duration=30&timezone=Asia/Shanghai`, method: 'get' },
      fetchCtx,
    );
    expect(res.status).toBe(0);
    const data = res.data as Record<string, unknown>;
    expect(data.date).toBe(CAL_DEFAULT_DATE);
    expect(data.duration).toBe(30);
    expect(data.durationText).toBe('30 分钟');
    const groups = data.groups as Array<{ key: string; slots: unknown[] }>;
    expect(groups).toHaveLength(3);
    const states = groups.flatMap((g) => g.slots as Array<{ state: string }>).map((s) => s.state);
    expect(states).toContain('almost-full');
    expect(states).toContain('expired');
  });

  it('branch is get-only for reads: post to read endpoints falls through unhandled', () => {
    const branch = createCalFetcherBranch(createCalEventMeta(), <T,>(v: T): T => v);
    expect(branch({ url: '/r/Cal__slots?date=2026-09-03', method: 'post', params: {}, body: {} })).toBeNull();
    expect(branch({ url: '/r/Cal__event', method: 'post', params: {}, body: {} })).toBeNull();
    expect(branch({ url: '/r/Other__event', method: 'get', params: {}, body: {} })).toBeNull();
  });
});

/**
 * Write-endpoint contract tests (plan 2026-08-29-1819-1 P3b Phase 1).
 * Session state lives inside the fetcher branch closure: one
 * createShowcaseEnv() call = one booking session, mirroring how the e2e
 * assigns one fresh browser context per test.
 */
describe('Cal write endpoints — session state (P3b Phase 1, red→green)', () => {
  const fetchCtx = { scope: null } as unknown as ApiRequestContext;

  async function post(env: ReturnType<typeof createShowcaseEnv>['env'], url: string, body: Record<string, SchemaValue>) {
    return env.fetcher!<Record<string, unknown>>({ url, method: 'post', data: body }, fetchCtx);
  }
  async function get(env: ReturnType<typeof createShowcaseEnv>['env'], url: string) {
    return env.fetcher!<Record<string, unknown>>({ url, method: 'get' }, fetchCtx);
  }

  it('Cal__selectSlot records a session pointer; Cal__selectedSlot reads it back with draft fields', async () => {
    const { env } = createShowcaseEnv();
    const missBefore = await get(env, '/r/Cal__selectedSlot');
    expect(missBefore.status).toBe(0);
    expect((missBefore.data as Record<string, unknown>).active).toBe(false);

    const res = await post(env, '/r/Cal__selectSlot', {
      slotId: '2026-09-03_45_09:00',
      timezone: 'Asia/Tokyo',
    });
    expect(res.status).toBe(0);
    expect((res.data as Record<string, unknown>).ok).toBe(true);

    const draft = (await get(env, '/r/Cal__selectedSlot')).data as Record<string, unknown>;
    expect(draft.active).toBe(true);
    expect(draft.slotId).toBe('2026-09-03_45_09:00');
    expect(draft.date).toBe('2026-09-03');
    expect(draft.duration).toBe(45);
    expect(draft.durationKey).toBe('45');
    expect(draft.durationText).toBe('45 分钟');
    expect(draft.time24).toBe('09:00');
    expect(draft.timeText).toBe('09:00 – 09:45');
    expect(draft.timezone).toBe('Asia/Tokyo');
    expect(draft.timezoneLabel).toContain('东京');
    expect(draft.dateText).toBe('2026年9月3日 周四');
    expect(Array.isArray(draft.guests)).toBe(true);
  });

  it('cal-select-miss: unmatched slot id fails and the pointer stays unchanged', async () => {
    const { env } = createShowcaseEnv();
    await post(env, '/r/Cal__selectSlot', { slotId: '2026-09-03_30_09:30', timezone: 'Asia/Shanghai' });

    const bad = await post(env, '/r/Cal__selectSlot', { slotId: '2026-09-03_30_99:99', timezone: 'Asia/Shanghai' });
    expect(bad.status).toBe(1);
    expect((bad.data as Record<string, unknown>).ok).toBe(false);

    const draft = (await get(env, '/r/Cal__selectedSlot')).data as Record<string, unknown>;
    expect(draft.time24).toBe('09:30');
  });

  it('Cal__book persists a booking observable via Cal__latestBooking (payload + slot + guests)', async () => {
    const { env } = createShowcaseEnv();
    await post(env, '/r/Cal__selectSlot', { slotId: '2026-09-03_30_10:00', timezone: 'Asia/Shanghai' });
    await post(env, '/r/Cal__addGuest', {});

    const res = await post(env, '/r/Cal__book', {
      name: '测试来宾',
      email: 'guest.runner@flux.demo',
      phone: '13800001234',
      notes: '想聊聊预约流程',
      companySize: 'm',
      focusArea: 'booking',
    });
    expect(res.status).toBe(0);
    const book = res.data as Record<string, unknown>;
    expect(book.ok).toBe(true);
    expect(typeof book.id).toBe('string');
    expect(book.status).toBe('confirmed');

    const latest = (await get(env, '/r/Cal__latestBooking')).data as Record<string, unknown>;
    expect(latest).not.toBeNull();
    expect(latest.id).toBe(book.id);
    expect(latest.name).toBe('测试来宾');
    expect(latest.email).toBe('guest.runner@flux.demo');
    expect(latest.status).toBe('confirmed');
    expect(latest.timeText).toBe('10:00 – 10:30');
    expect(latest.durationText).toBe('30 分钟');
    const guests = latest.guests as string[];
    expect(guests).toHaveLength(2);
    expect(guests).toContain('lin.zhiqing@flux.demo');
  });

  it('cal-book-expired: booking an expired slot fails without persisting', async () => {
    const { env } = createShowcaseEnv();
    // The expired sample on the default date × 30min is the 10:30 morning slot.
    await post(env, '/r/Cal__selectSlot', { slotId: '2026-09-03_30_10:30', timezone: 'Asia/Shanghai' });
    const draft = (await get(env, '/r/Cal__selectedSlot')).data as Record<string, unknown>;
    expect(draft.state).toBe('expired');

    const res = await post(env, '/r/Cal__book', { name: '测试来宾', email: 'guest.runner@flux.demo' });
    expect(res.status).toBe(1);
    expect((res.data as Record<string, unknown>).ok).toBe(false);

    const latest = (await get(env, '/r/Cal__latestBooking')).data as unknown;
    expect(latest).toBeNull();
  });

  it('Cal__book honors a requires-confirmation marker as the pending variant', async () => {
    const { env } = createShowcaseEnv();
    await post(env, '/r/Cal__selectSlot', { slotId: '2026-09-03_30_10:00', timezone: 'Asia/Shanghai' });
    const res = await post(env, '/r/Cal__book', {
      name: '待确认来宾',
      email: 'pending.runner@flux.demo',
      requiresConfirmation: true,
    });
    expect(res.status).toBe(0);
    expect((res.data as Record<string, unknown>).status).toBe('pending');
    const latest = (await get(env, '/r/Cal__latestBooking')).data as Record<string, unknown>;
    expect(latest.status).toBe('pending');
  });

  it('Cal__cancelBooking flips the latest booking to cancelled; db stays observable', async () => {
    const { env } = createShowcaseEnv();
    await post(env, '/r/Cal__book', { name: '取消来宾', email: 'cancel.runner@flux.demo' });
    const before = (await get(env, '/r/Cal__latestBooking')).data as Record<string, unknown>;
    expect(before.status).toBe('confirmed');

    const res = await post(env, '/r/Cal__cancelBooking', { reason: '行程冲突' });
    expect(res.status).toBe(0);
    expect((res.data as Record<string, unknown>).status).toBe('cancelled');

    const after = (await get(env, '/r/Cal__latestBooking')).data as Record<string, unknown>;
    expect(after.status).toBe('cancelled');
    expect(after.reason).toBe('行程冲突');
    expect(after.id).toBe(before.id);
  });

  it('cal-cancel-miss: unknown booking id fails and state does not flip', async () => {
    const { env } = createShowcaseEnv();
    await post(env, '/r/Cal__book', { name: '保留来宾', email: 'keep.runner@flux.demo' });

    const res = await post(env, '/r/Cal__cancelBooking', { id: 'BK999', reason: '误操作' });
    expect(res.status).toBe(1);
    expect((res.data as Record<string, unknown>).ok).toBe(false);

    const latest = (await get(env, '/r/Cal__latestBooking')).data as Record<string, unknown>;
    expect(latest.status).toBe('confirmed');
  });

  it('Cal__addGuest / Cal__removeGuest mutate the session guest list; out-of-range remove fails', async () => {
    const { env } = createShowcaseEnv();
    const add1 = await post(env, '/r/Cal__addGuest', {});
    expect(add1.status).toBe(0);
    let guests = (add1.data as Record<string, unknown>).guests as string[];
    expect(guests).toHaveLength(2);

    const add2 = await post(env, '/r/Cal__addGuest', {});
    guests = (add2.data as Record<string, unknown>).guests as string[];
    expect(guests).toHaveLength(3);
    expect(new Set(guests).size).toBe(3);

    const bad = await post(env, '/r/Cal__removeGuest', { index: 99 });
    expect(bad.status).toBe(1);

    const del = await post(env, '/r/Cal__removeGuest', { index: 2 });
    expect(del.status).toBe(0);
    guests = (del.data as Record<string, unknown>).guests as string[];
    expect(guests).toHaveLength(2);
  });

  it('Cal__shareLink returns the booking share url', async () => {
    const { env } = createShowcaseEnv();
    const res = await get(env, '/r/Cal__shareLink');
    expect(res.status).toBe(0);
    expect((res.data as Record<string, unknown>).ok).toBe(true);
    expect(String((res.data as Record<string, unknown>).url)).toContain('cal-booking');
  });

  it('Cal__slots marks the session-selected slot and clears the static sample once a pointer exists', async () => {
    const { env } = createShowcaseEnv();
    const url = `/r/Cal__slots?date=${CAL_DEFAULT_DATE}&duration=30&timezone=Asia/Shanghai`;

    const fresh = (await get(env, url)).data as Record<string, unknown>;
    const freshSelected = (fresh.groups as Array<{ slots: Array<{ time24: string; selected?: boolean }> }>)
      .flatMap((g) => g.slots)
      .filter((s) => s.selected === true);
    expect(freshSelected.map((s) => s.time24)).toEqual(['10:00']);

    await post(env, '/r/Cal__selectSlot', { slotId: '2026-09-03_30_09:00', timezone: 'Asia/Shanghai' });
    const after = (await get(env, url)).data as Record<string, unknown>;
    const slots = (after.groups as Array<{ slots: Array<{ time24: string; selected?: boolean }> }>)
      .flatMap((g) => g.slots);
    expect(slots.filter((s) => s.selected === true).map((s) => s.time24)).toEqual(['09:00']);
  });
});

describe('Cal page registration', () => {
  it('registers the 3 cal-* pages in the app-replica category', () => {
    const entries = COMPLEX_PAGE_ENTRIES.filter((e) => e.id.startsWith('cal-'));
    expect(entries.map((e) => e.id)).toEqual(['cal-booking', 'cal-confirm', 'cal-success']);
    for (const entry of entries) {
      expect(entry.category).toBe('app-replica');
      expect(entry.description).toContain('Cal.com');
      expect(entry.features.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('Cal booking schema wiring (P3b Phase 2)', () => {
  it('slots source declares the 5-minute Booker polling interval and template params', () => {
    const sources = bookingSchema.body.filter((n) => n.type === 'data-source');
    const slots = sources.find((s) => 'name' in s && s.name === 'slots');
    expect(slots).toBeTruthy();
    expect((slots as { interval?: number }).interval).toBe(300000);
    expect((slots as { dependsOn?: string[] }).dependsOn).toEqual(
      expect.arrayContaining(['calDate', 'calDuration', 'calTimezone']),
    );
  });

  it('calendar declares scope-owned selected date; duration tabs bind calDuration', () => {
    const text = JSON.stringify(bookingSchema);
    expect(text).toContain('"dateOwnership":"scope"');
    expect(text).toContain('"dateStatePath":"calDate"');
    expect(text).toContain('"valueStatePath":"calDuration"');
    expect(text).toContain('/r/Cal__selectSlot');
  });
});

/**
 * Confirm/success interaction wiring (plan 2026-08-29-1819-1 P3b Phase 3/4).
 * Schema-contract assertions complement the e2e flows: submit/back chain,
 * guest session endpoints, status-aware success page, cancel dialog.
 */
describe('Cal confirm schema wiring (P3b Phase 3)', () => {
  const fetchCtx = { scope: null } as unknown as ApiRequestContext;

  function findNode(node: unknown, type: string): Record<string, unknown> | undefined {
    if (Array.isArray(node)) {
      for (const child of node) {
        const hit = findNode(child, type);
        if (hit) return hit;
      }
      return undefined;
    }
    if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>;
      if (record.type === type) return record;
      for (const value of Object.values(record)) {
        if (value && typeof value === 'object') {
          const hit = findNode(value, type);
          if (hit) return hit;
        }
      }
    }
    return undefined;
  }

  const formNode = findNode(confirmSchema.body, 'form')!;

  it('submit chain: form posts Cal__book, success navigates to cal-success, failure returns to booking', () => {
    const submitAction = formNode.submitAction as Record<string, unknown>;
    const args = submitAction.args as Record<string, unknown>;
    const messages = submitAction.messages as Record<string, string>;
    expect(args.url).toBe('/r/Cal__book');
    expect(args.method).toBe('post');
    expect(args.includeScope).toBe('*');
    expect(messages.success).toContain('预约');
    expect(messages.failed).toContain('选择其他时段');

    const onSubmitSuccess = formNode.onSubmitSuccess as Record<string, unknown>;
    expect(onSubmitSuccess.action).toBe('navigate');
    expect((onSubmitSuccess.args as Record<string, unknown>).url).toContain('cal-success');

    const onSubmitError = formNode.onSubmitError as Record<string, unknown>;
    expect(onSubmitError.action).toBe('navigate');
    expect((onSubmitError.args as Record<string, unknown>).url).toContain('cal-booking');
    // Validation failures must NOT route through onSubmitError (stay on page).
    expect(formNode.onValidateError).toBeUndefined();
  });

  it('guest add/remove wired to the session endpoints; rows loop over the selected draft', () => {
    const text = JSON.stringify(confirmSchema);
    expect(text).toContain('/r/Cal__addGuest');
    expect(text).toContain('/r/Cal__removeGuest');
    expect(text).toContain('"componentId":"cal-selected-source"');
    expect(text).toContain('${selected?.guests}');
    expect(text).toContain('${$slot.index}');
    expect(text).toContain('"testid":"cal-confirm-guest-row"');
    expect(text).toContain('"testid":"cal-confirm-guest-chip"');
    expect(text).toContain('"testid":"cal-confirm-guest-remove"');
  });

  it('back button navigates to the booking page', () => {
    const text = JSON.stringify(confirmSchema);
    expect(text).toContain('"testid":"cal-confirm-back"');
    expect(text).toContain('cal-booking');
  });

  it('opt-in e2e hooks: force-slot hook drives the real selectSlot path; counters observe writes', async () => {
    const hooksState = globalThis as { __calTestHooks?: { selectSlot?: (slotId: string) => void } };
    const counterState = globalThis as { __calEndpointCalls?: Record<string, number> };
    hooksState.__calTestHooks = {};
    counterState.__calEndpointCalls = {};
    try {
      const { env } = createShowcaseEnv();
      expect(hooksState.__calTestHooks.selectSlot).toBeTypeOf('function');
      hooksState.__calTestHooks.selectSlot!('2026-09-03_30_10:30');

      const draft = await env.fetcher!<Record<string, unknown>>(
        { url: '/r/Cal__selectedSlot', method: 'get' },
        fetchCtx,
      );
      expect((draft.data as Record<string, unknown>).state).toBe('expired');
      expect((draft.data as Record<string, unknown>).time24).toBe('10:30');

      const book = await env.fetcher!<Record<string, unknown>>(
        { url: '/r/Cal__book', method: 'post', data: { name: 'x', email: 'y@flux.demo' } },
        fetchCtx,
      );
      expect(book.status).toBe(1);
      expect(counterState.__calEndpointCalls!['Cal__book']).toBe(1);
      expect(counterState.__calEndpointCalls!['Cal__selectSlot']).toBe(1);
    } finally {
      delete hooksState.__calTestHooks;
      delete counterState.__calEndpointCalls;
    }
  });
});

describe('Cal success schema wiring (P3b Phase 4)', () => {
  it('reads the latest booking and binds the status-aware badge plus booked summary', () => {
    const sources = successSchema.body.filter((n) => n.type === 'data-source');
    const booking = sources.find((s) => 'name' in s && s.name === 'booking');
    expect(booking).toBeTruthy();
    expect((booking as { action?: string }).action).toBe('ajax');
    expect(JSON.stringify(booking)).toContain('/r/Cal__latestBooking');

    const text = JSON.stringify(successSchema);
    expect(text).toContain('${booking?.status !== \'confirmed\'}');
    expect(text).toContain("booking?.status === 'cancelled'");
    expect(text).toContain('${booking?.dateText ?? event?.preview?.dateText}');
    expect(text).toContain('${booking?.timeText ?? event?.preview?.timeText}');
    expect(text).toContain('${booking?.durationText ?? event?.preview?.durationText}');
  });

  it('copy link fires Cal__shareLink with success feedback (I11 semantic simulation)', () => {
    const text = JSON.stringify(successSchema);
    expect(text).toContain('/r/Cal__shareLink');
    expect(text).toContain('链接已复制');
  });

  it('reschedule navigates back to the booking view; cancel opens the reason dialog wired to Cal__cancelBooking', () => {
    const text = JSON.stringify(successSchema);
    expect(text).toContain('"testid":"cal-success-reschedule"');
    expect(text).toContain('"testid":"cal-cancel-dialog"');
    expect(text).toContain('"testid":"cal-cancel-reason"');
    expect(text).toContain('"testid":"cal-cancel-dialog-cancel"');
    expect(text).toContain('"testid":"cal-cancel-dialog-confirm"');
    expect(text).toContain('/r/Cal__cancelBooking');
    expect(text).toContain('预约已取消');
  });
});
