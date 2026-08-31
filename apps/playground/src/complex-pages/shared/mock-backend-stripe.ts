/**
 * Financial-dashboard replica mock data + fetcher branch (plan
 * 2026-08-30-0953-2 P7a reads; plan 2026-08-30-1333-1 P7b writes; airtable/
 * notion module precedent).
 *
 * This module owns the full `/r/Stripe__*` fetcher surface so
 * `showcase-env.ts` stays under the 700-line hard gate (branch-sink
 * precedent). The payment dataset lives in `mock-backend-stripe-payments.ts`,
 * overview aggregates in `mock-backend-stripe-overview.ts`, write/semantic
 * cores in `mock-backend-stripe-writes.ts`, and types/registries in
 * `mock-backend-stripe-types.ts`. Session state (the payments array) is
 * owned by the factory closure, so writes are observable within a session.
 *
 * Read endpoints (get): `Stripe__payments` (list payload
 * `{items,total,page,perPage,pages}`; `keyword=` keyword-search downgrade
 * (§6.2); `status=` enum filter, non-enum → full fallback st-status-unknown;
 * `minAmount=` major-unit numeric filter, invalid → ignored
 * st-filter-unknown; `range=` date-range filter (prev/mtd → empty,
 * st-filter-unknown style fallback for unknown values); zero-match keyword →
 * empty items without error st-payments-miss), `Stripe__payment?id=`
 * (drawer detail; miss → placeholder row st-payment-miss), `Stripe__overview`
 * (`range=` outside the sample month or `empty=1` → empty-curve fallback
 * st-overview-empty), `Stripe__exportPayments` (zero-side-effect export
 * confirmation payload; zero columns → st-export-empty).
 * Write endpoints (post, P7b): `Stripe__refundPayment` (session status flip +
 * timeline event; miss st-refund-miss / already-refunded guards).
 *
 * Opt-in e2e hooks (mirror mock-backend-airtable): specs pre-create
 * `window.__stripeEndpointCalls` / `window.__stripeTestHooks` via
 * addInitScript; production never sets them, so both stay no-ops.
 *
 * All copy is original self-authored Chinese; zero trademark/brand assets.
 */

import {
  createStripePayments,
  filterStPayments,
  isStEmptyRange,
  paginateStPayments,
  toStPaymentRow,
} from './mock-backend-stripe-payments';
import { createStripeEmptyOverview, createStripeOverview } from './mock-backend-stripe-overview';
import { exportStripePayments, refundStripePayment } from './mock-backend-stripe-writes';
import type { StripeDatabase, StPayment } from './mock-backend-stripe-types';

export * from './mock-backend-stripe-types';
export * from './mock-backend-stripe-payments';
export * from './mock-backend-stripe-overview';
export * from './mock-backend-stripe-writes';

export function createStripeDatabase(): StripeDatabase {
  return { payments: createStripePayments() };
}

export interface StripeFetcherBranchInput {
  url: string;
  method: string;
  params: Record<string, unknown>;
  body: Record<string, unknown>;
}

type StripeTestHooks = {
  refundMiss?: boolean;
  /** last `/r/Stripe__*` url (opt-in e2e observation; production no-op) */
  lastUrl?: string;
};

function readStripeTestHooks(): StripeTestHooks | undefined {
  return (globalThis as { __stripeTestHooks?: StripeTestHooks }).__stripeTestHooks;
}

function countStripeEndpointCall(url: string): void {
  const counters = (globalThis as { __stripeEndpointCalls?: Record<string, number> })
    .__stripeEndpointCalls;
  if (!counters) return;
  const name = url.slice(url.indexOf('Stripe__')).split('?')[0];
  counters[name] = (counters[name] ?? 0) + 1;
  const hooks = readStripeTestHooks();
  if (hooks) hooks.lastUrl = url;
}

/**
 * Full `/r/Stripe__*` fetcher branch. Read payloads clone out of the session
 * state; the refund write mutates the session payments array in place.
 * Unknown ids/params fall back per the P7a/P7b failure-path tables
 * (st-payment-miss / st-status-unknown / st-payments-miss / st-overview-empty
 * / st-export-empty / st-refund-miss / st-filter-unknown).
 */
export function createStripeFetcherBranch(db: StripeDatabase, clone: <T>(value: T) => T) {
  function placeholderPayment(id: string): StPayment {
    const fallback = db.payments[0];
    return { ...fallback, id, customer: '未找到交易（占位样本）', description: '占位记录' };
  }

  function handleStripeBranch<T>(
    input: StripeFetcherBranchInput,
  ): { status: number; data: T } | null {
    const { url, method, params, body } = input;
    if (!url.includes('/r/Stripe__')) {
      return null;
    }
    countStripeEndpointCall(url);
    const normalizedMethod = method.toLowerCase();

    // ----- writes (P7b) -----
    if (normalizedMethod === 'post') {
      if (url.includes('/r/Stripe__refundPayment')) {
        const hooks = readStripeTestHooks();
        const result = refundStripePayment(db.payments, {
          id: typeof body.id === 'string' ? body.id : undefined,
          forceMiss: hooks?.refundMiss === true,
        });
        return result.ok
          ? { status: 0, data: clone(result) as T }
          : { status: 1, data: clone(result) as T };
      }
      if (url.includes('/r/Stripe__exportPayments')) {
        // Form-submit path: checkbox boolean flags arrive in the request body
        // under the `col*` field names (`includeScope:'*'`); the
        // zero-side-effect contract matches the get path.
        const flag = (key: string): string | boolean | undefined =>
          (body[`col${key.charAt(0).toUpperCase()}${key.slice(1)}`] ??
            body[key]) as string | boolean | undefined;
        const result = exportStripePayments(db.payments, {
          amount: flag('amount'),
          date: flag('date'),
          status: flag('status'),
          customer: flag('customer'),
          method: flag('method'),
        });
        return result.ok
          ? { status: 0, data: clone(result) as T }
          : { status: 1, data: clone(result) as T };
      }
      return { status: 1, data: clone({ ok: false, error: 'unknown Stripe endpoint' }) as T };
    }
    if (normalizedMethod !== 'get') {
      return { status: 1, data: clone({ ok: false, error: 'unknown Stripe endpoint' }) as T };
    }

    const qs = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams();
    const read = (key: string): string | undefined => {
      const value = params[key] ?? body[key] ?? qs.get(key);
      return value === undefined || value === null ? undefined : String(value);
    };

    // ----- reads (P7a) + search/filter/range parameterization (P7b) -----
    if (url.includes('/r/Stripe__payments')) {
      const rows = filterStPayments(
        db.payments,
        read('keyword'),
        read('status'),
        read('minAmount'),
        read('range'),
      );
      const paged = paginateStPayments(
        rows,
        Number(read('page') ?? 1) || 1,
        Number(read('perPage') ?? 10) || 10,
      );
      return { status: 0, data: clone(paged) as T };
    }
    if (url.includes('/r/Stripe__exportPayments')) {
      const result = exportStripePayments(db.payments, {
        amount: read('amount'),
        date: read('date'),
        status: read('status'),
        customer: read('customer'),
        method: read('method'),
      });
      return result.ok
        ? { status: 0, data: clone(result) as T }
        : { status: 1, data: clone(result) as T };
    }
    if (url.includes('/r/Stripe__payment')) {
      const id = read('id') ?? '';
      const found = db.payments.find((r) => r.id === id);
      return {
        status: 0,
        data: clone(toStPaymentRow(found ?? placeholderPayment(id))) as T,
      };
    }
    if (url.includes('/r/Stripe__overview')) {
      const payload =
        qs.get('empty') === '1' || isStEmptyRange(read('range'))
          ? createStripeEmptyOverview()
          : createStripeOverview();
      return { status: 0, data: clone(payload) as T };
    }
    return { status: 0, data: clone({ ok: false, error: 'unknown replica endpoint' }) as T };
  }

  // Opt-in e2e hook reset: keep the forced-miss flag from leaking across
  // specs (airtable precedent).
  const hooks = (globalThis as { __stripeTestHooks?: StripeTestHooks }).__stripeTestHooks;
  if (hooks) {
    hooks.refundMiss = false;
  }

  return handleStripeBranch;
}
