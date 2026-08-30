/**
 * Financial-dashboard replica mock data + fetcher branch (plan
 * 2026-08-30-0953-2 P7a reads; P7b will add writes on top; airtable/notion
 * module precedent).
 *
 * This module owns the full `/r/Stripe__*` fetcher surface so
 * `showcase-env.ts` stays under the 700-line hard gate (branch-sink
 * precedent). The payment dataset lives in `mock-backend-stripe-payments.ts`,
 * overview aggregates in `mock-backend-stripe-overview.ts`, and types /
 * registries in `mock-backend-stripe-types.ts`. Session state (the payments
 * array) is owned by the factory closure.
 *
 * Read endpoints (get, P7a get-only): `Stripe__payments` (list payload
 * `{items,total,page,perPage,pages}`; `keyword=` keyword-search downgrade
 * (§6.2); `status=` enum filter, non-enum → full fallback st-status-unknown;
 * zero-match keyword → empty items without error st-payments-miss),
 * `Stripe__payment?id=` (drawer detail; miss → placeholder row
 * st-payment-miss), `Stripe__overview` (`empty=1` → empty-curve fallback
 * st-overview-empty). Writes belong to P7b — non-get methods fail (status 1).
 *
 * All copy is original self-authored Chinese; zero trademark/brand assets.
 */

import {
  createStripePayments,
  filterStPayments,
  paginateStPayments,
  toStPaymentRow,
} from './mock-backend-stripe-payments';
import { createStripeEmptyOverview, createStripeOverview } from './mock-backend-stripe-overview';
import type { StripeDatabase, StPayment } from './mock-backend-stripe-types';

export * from './mock-backend-stripe-types';
export * from './mock-backend-stripe-payments';
export * from './mock-backend-stripe-overview';

export function createStripeDatabase(): StripeDatabase {
  return { payments: createStripePayments() };
}

export interface StripeFetcherBranchInput {
  url: string;
  method: string;
  params: Record<string, unknown>;
  body: Record<string, unknown>;
}

/**
 * Full `/r/Stripe__*` fetcher branch. Read payloads clone out of the session
 * state; unknown ids/params fall back per the P7a failure-path table
 * (st-payment-miss / st-status-unknown / st-payments-miss / st-overview-empty).
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
    const normalizedMethod = method.toLowerCase();
    if (normalizedMethod !== 'get') {
      return { status: 1, data: clone({ ok: false, error: 'unknown Stripe endpoint' }) as T };
    }

    const qs = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams();
    const read = (key: string): string | undefined => {
      const value = params[key] ?? body[key] ?? qs.get(key);
      return value === undefined || value === null ? undefined : String(value);
    };

    if (url.includes('/r/Stripe__payments')) {
      const rows = filterStPayments(db.payments, read('keyword'), read('status'));
      const paged = paginateStPayments(
        rows,
        Number(read('page') ?? 1) || 1,
        Number(read('perPage') ?? 10) || 10,
      );
      return { status: 0, data: clone(paged) as T };
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
        qs.get('empty') === '1' ? createStripeEmptyOverview() : createStripeOverview();
      return { status: 0, data: clone(payload) as T };
    }
    return { status: 0, data: clone({ ok: false, error: 'unknown replica endpoint' }) as T };
  }

  return handleStripeBranch;
}
