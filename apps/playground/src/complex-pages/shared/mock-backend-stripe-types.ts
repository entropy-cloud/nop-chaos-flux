/**
 * Financial-dashboard replica — shared types + registries (plan
 * 2026-08-30-0953-2 P7a Phase 1, airtable/notion entity-module precedent).
 *
 * Payment/risk/currency registries, KPI + curve payload shapes. Pure
 * declarations + deterministic registries only; the payment dataset lives in
 * `mock-backend-stripe-payments.ts`, the overview aggregates in
 * `mock-backend-stripe-overview.ts`, and the fetcher branch in
 * `mock-backend-stripe.ts`.
 *
 * Status pills follow the ladder-pair structure (🌐 official badge rule:
 * background one shade up, text two shades up within the same hue ladder);
 * concrete hex values are style-equivalent proposals (📊 拟定, see
 * stripe-replica.css header + plan 差异声明 D3). All copy is original
 * self-authored Chinese; zero trademark/brand assets.
 */

export type StPaymentStatus = 'succeeded' | 'pending' | 'failed' | 'refunded';

export type StRiskLevel = 'normal' | 'elevated' | 'high';

export type StCurrency = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY';

export interface StTimelineEvent {
  label: string;
  time: string;
  tone: 'done' | 'pending' | 'failed';
}

export interface StPayment {
  id: string;
  /** Minor units (cents); JPY carries 0 decimals per currency registry. */
  amountMinor: number;
  currency: StCurrency;
  status: StPaymentStatus;
  customer: string;
  email: string;
  brand: string;
  last4: string;
  risk: StRiskLevel;
  description: string;
  /** '2026-08-02 14:32' deterministic sample stamps. */
  createdAt: string;
  timeline: StTimelineEvent[];
  metadata: Array<{ label: string; value: string }>;
}

/** Row projection with precomputed pill/chip classes and display labels. */
export interface StPaymentRow extends StPayment {
  statusLabel: string;
  statusPillClass: string;
  amountLabel: string;
  methodLabel: string;
  dateLabel: string;
  riskLabel: string;
  riskChipClass: string;
}

export interface StPaymentsPayload {
  items: StPaymentRow[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}

export interface StKpi {
  netVolumeLabel: string;
  netVolumeDelta: string;
  chargeCount: number;
  chargeCountDelta: string;
  avgChargeLabel: string;
  refundTotalLabel: string;
}

export interface StCurvePoint {
  label: string;
  net: number;
  prev: number;
}

export interface StOverviewPayload {
  kpi: StKpi;
  curve: StCurvePoint[];
  total: number;
}

export interface StripeDatabase {
  payments: StPayment[];
}

/** 四语义状态注册表：pill 色阶对类名（bg+1/text+2 档结构，hex 拟定）。 */
export const ST_STATUS_META: Record<StPaymentStatus, { label: string; pillClass: string }> = {
  succeeded: { label: '已成功', pillClass: 'st-pill st-pill-ok' },
  pending: { label: '待处理', pillClass: 'st-pill st-pill-pending' },
  failed: { label: '已失败', pillClass: 'st-pill st-pill-failed' },
  refunded: { label: '已退款', pillClass: 'st-pill st-pill-refunded' },
};

/** 币种小数位样本（I7：小数位按币种 🌐）——JPY 为 0 位小数对照。 */
export const ST_CURRENCY_META: Record<StCurrency, { symbol: string; decimals: number }> = {
  CNY: { symbol: 'CN¥', decimals: 2 },
  USD: { symbol: '$', decimals: 2 },
  EUR: { symbol: '€', decimals: 2 },
  GBP: { symbol: '£', decimals: 2 },
  JPY: { symbol: 'JP¥', decimals: 0 },
};

export const ST_RISK_META: Record<StRiskLevel, { label: string; chipClass: string }> = {
  normal: { label: '正常', chipClass: 'st-chip-risk st-chip-risk-normal' },
  elevated: { label: '偏高', chipClass: 'st-chip-risk st-chip-risk-elevated' },
  high: { label: '高风险', chipClass: 'st-chip-risk st-chip-risk-high' },
};

/** 支付方式品牌样本（语义等价自拟，不复制卡片组织原图/素材）。 */
export const ST_BRANDS = ['Visa', '万事达', '银联', '钱包余额'] as const;
