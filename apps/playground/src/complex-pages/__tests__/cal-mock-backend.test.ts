import { describe, expect, it } from 'vitest';
import type { ApiRequestContext } from '@nop-chaos/flux-core';
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

  it('branch is get-only: post requests are not handled (fall through unhandled)', () => {
    const branch = createCalFetcherBranch(createCalEventMeta(), <T,>(v: T): T => v);
    expect(branch({ url: '/r/Cal__slots?date=2026-09-03', method: 'post', params: {}, body: {} })).toBeNull();
    expect(branch({ url: '/r/Cal__event', method: 'post', params: {}, body: {} })).toBeNull();
    expect(branch({ url: '/r/Other__event', method: 'get', params: {}, body: {} })).toBeNull();
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
