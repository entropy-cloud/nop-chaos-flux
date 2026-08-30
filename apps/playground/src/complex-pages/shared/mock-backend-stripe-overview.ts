/**
 * Financial-dashboard replica — overview KPI + net-volume curve (plan
 * 2026-08-30-0953-2 P7a Phase 1).
 *
 * KPI cards and the 30-point net/prev curve are precomputed deterministic
 * aggregates of the sample period (P1 README §4.2: chart data flows through
 * the mock endpoint as a precomputed series, never a hardcoded display array
 * inside the schema). `createStripeEmptyOverview` serves the st-overview-empty
 * fallback (missing series → empty-curve placeholder payload).
 *
 * All copy is original self-authored Chinese; zero trademark/brand assets.
 */

import type { StOverviewPayload } from './mock-backend-stripe-types';

export function createStripeOverview(): StOverviewPayload {
  const days = 30;
  const curve = Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    const net = Math.round(9800 + 4200 * Math.abs(Math.sin(i * 0.7)) + (i % 5) * 640);
    const prev = Math.round(8400 + 3600 * Math.abs(Math.sin(i * 0.55 + 1.2)) + ((i + 2) % 5) * 520);
    return { label: `8/${String(day).padStart(2, '0')}`, net, prev };
  });
  return {
    kpi: {
      netVolumeLabel: 'CN¥486,210.75',
      netVolumeDelta: '+12.4%',
      chargeCount: 1286,
      chargeCountDelta: '+8.2%',
      avgChargeLabel: 'CN¥378.15',
      refundTotalLabel: 'CN¥12,930.00',
    },
    curve,
    total: curve.length,
  };
}

/** st-overview-empty：序列数据缺 → 空序列 + KPI 占位，不报错。 */
export function createStripeEmptyOverview(): StOverviewPayload {
  return {
    kpi: {
      netVolumeLabel: 'CN¥0.00',
      netVolumeDelta: '0.0%',
      chargeCount: 0,
      chargeCountDelta: '0.0%',
      avgChargeLabel: 'CN¥0.00',
      refundTotalLabel: 'CN¥0.00',
    },
    curve: [],
    total: 0,
  };
}
