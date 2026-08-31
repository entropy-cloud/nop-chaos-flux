/**
 * Financial-dashboard replica — write + semantic-simulation cores (plan
 * 2026-08-30-1333-1 P7b Phase 1; airtable/notion writes-module precedent).
 *
 * `refundStripePayment` mutates the session payment (status → refunded +
 * deterministic timeline event, already-refunded guard, miss branch
 * st-refund-miss). `exportStripePayments` is the zero-side-effect
 * semantic-simulation carrier for the export dialog (copyLink/shareLink
 * precedent): no download channel exists in `RendererEnv`, so the endpoint
 * returns an export-confirmation payload instead of a file; zero selected
 * columns fail with st-export-empty.
 *
 * All copy is original self-authored Chinese; zero trademark/brand assets.
 */

import type { StPayment } from './mock-backend-stripe-types';

export interface StRefundRequest {
  id?: string;
  forceMiss?: boolean;
}

export interface StRefundResult {
  ok: boolean;
  id?: string;
  status?: string;
  error?: string;
}

export interface StExportRequest {
  amount?: string | boolean;
  date?: string | boolean;
  status?: string | boolean;
  customer?: string | boolean;
  method?: string | boolean;
}

export interface StExportResult {
  ok: boolean;
  count?: number;
  columns?: string[];
  filename?: string;
  error?: string;
}

const ST_EXPORT_COLUMN_LABELS: Record<string, string> = {
  amount: '金额',
  date: '日期',
  status: '状态',
  customer: '客户邮箱',
  method: '支付方式',
};

/**
 * Session write: flip the payment to refunded and append the deterministic
 * refund timeline event. Miss (unknown id / forced) and already-refunded
 * guards leave the session untouched.
 */
export function refundStripePayment(records: StPayment[], request: StRefundRequest): StRefundResult {
  const id = typeof request.id === 'string' ? request.id : '';
  const found = id ? records.find((r) => r.id === id) : undefined;
  if (request.forceMiss || !found) {
    return { ok: false, error: 'payment not found' };
  }
  if (found.status === 'refunded') {
    return { ok: false, error: 'already refunded' };
  }
  found.status = 'refunded';
  found.timeline = [
    ...found.timeline,
    { label: '退款已发起（复刻语义模拟）', time: found.createdAt, tone: 'done' },
  ];
  return { ok: true, id: found.id, status: found.status };
}

/**
 * Zero-side-effect export confirmation payload (P7b I9 semantic
 * simulation). Column flags arrive as url params (get semantic path) or
 * boolean form values (post form-submit path, `includeScope:'*'` body); an
 * empty selection fails (st-export-empty) and any selection serves the row
 * count + column labels without mutating session state.
 */
export function exportStripePayments(records: StPayment[], request: StExportRequest): StExportResult {
  const selected = (value: string | boolean | undefined): boolean =>
    value === true || value === 'true' || (typeof value === 'string' && value.trim() !== '');
  const columns = (Object.keys(ST_EXPORT_COLUMN_LABELS) as Array<keyof StExportRequest>)
    .filter((key) => selected(request[key]))
    .map((key) => ST_EXPORT_COLUMN_LABELS[key]);
  if (columns.length === 0) {
    return { ok: false, error: 'no columns selected' };
  }
  return { ok: true, count: records.length, columns, filename: 'payments-export-2026-08.csv' };
}
