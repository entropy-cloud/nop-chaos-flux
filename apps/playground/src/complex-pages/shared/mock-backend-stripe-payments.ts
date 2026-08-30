/**
 * Financial-dashboard replica — payment dataset factory + row projection +
 * query helpers (plan 2026-08-30-0953-2 P7a Phase 1, airtable records-module
 * precedent).
 *
 * 36 deterministic payments covering all four status semantics (succeeded /
 * pending / failed / refunded), five currencies with the JPY 0-decimal
 * contrast, card-brand + last4 + risk samples, per-status timeline partitions
 * and metadata rows. Pagination: default page size 10 → ≥3 pages (client
 * table pageSize 10; the endpoint serves the full set with `perPage=100`
 * exactly like the airtable precedent).
 *
 * All copy is original self-authored Chinese; zero trademark/brand assets.
 */

import {
  ST_BRANDS,
  ST_CURRENCY_META,
  ST_RISK_META,
  ST_STATUS_META,
  type StCurrency,
  type StPayment,
  type StPaymentRow,
  type StPaymentsPayload,
  type StRiskLevel,
  type StPaymentStatus,
} from './mock-backend-stripe-types';

const CUSTOMERS = [
  '云帆文创',
  '华智物联',
  '南风书店',
  '启程旅行',
  '青柠咖啡',
  '北极星设计',
  '四季生鲜',
  '墨鱼动漫',
  '灵犀教育',
  '风行体育',
  '望山茶室',
  '星野摄影',
];

const EMAIL_DOMAINS = ['yunfan', 'huazhi', 'nanfeng', 'qicheng', 'qingning', 'beijixing'];

const DESCRIPTIONS = [
  '年度会员订阅（12 个月）',
  '智能网关硬件采购',
  '周末读书会报名费',
  '出发前尾款结算',
  '门店拿铁月卡',
  '品牌视觉升级项目款',
  '每周鲜蔬配送',
  '数字漫画季度包',
  '少儿编程秋季班',
  '羽毛球场地年卡',
  '高山乌龙礼盒预售',
  '旅拍底片精修服务',
];

const STATUS_CYCLE: StPaymentStatus[] = [
  'succeeded',
  'succeeded',
  'pending',
  'refunded',
  'succeeded',
  'failed',
];

const CURRENCY_CYCLE: StCurrency[] = [
  'CNY',
  'CNY',
  'CNY',
  'USD',
  'CNY',
  'EUR',
  'CNY',
  'JPY',
  'CNY',
  'GBP',
];

const CHANNELS = ['线上商城', '小程序', '门店收银', 'API 集成'];

function pick<T>(list: readonly T[], index: number): T {
  return list[index % list.length];
}

function buildTimeline(status: StPaymentStatus, createdAt: string, extraMinutes: number) {
  const shift = (stamp: string, minutes: number): string => {
    const [day, clock] = stamp.split(' ');
    const [h, m] = clock.split(':').map((v) => Number(v));
    const total = h * 60 + m + minutes;
    const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${day} ${hh}:${mm}`;
  };
  const base: Array<{ label: string; time: string; tone: 'done' | 'pending' | 'failed' }> = [
    { label: '交易创建', time: createdAt, tone: 'done' },
    { label: '风险评估通过', time: shift(createdAt, 1), tone: 'done' },
  ];
  if (status === 'succeeded') {
    base.push({ label: '收款成功，资金进入待结算余额', time: shift(createdAt, 2), tone: 'done' });
  } else if (status === 'pending') {
    base.push({
      label: '银行处理中，预计 1-3 个工作日到账',
      time: shift(createdAt, 2),
      tone: 'pending',
    });
  } else if (status === 'failed') {
    base.push({
      label: '收款失败：发卡行拒绝（insufficient_funds）',
      time: shift(createdAt, 2),
      tone: 'failed',
    });
  } else {
    base.push({ label: '收款成功，资金进入待结算余额', time: shift(createdAt, 2), tone: 'done' });
    base.push({
      label: '退款已发起（客户申请换货）',
      time: shift(createdAt, 30 + extraMinutes),
      tone: 'done',
    });
    base.push({ label: '退款已原路退回', time: shift(createdAt, 90 + extraMinutes), tone: 'done' });
  }
  return base;
}

export function createStripePayments(): StPayment[] {
  return Array.from({ length: 36 }, (_, i) => {
    const status = pick(STATUS_CYCLE, i);
    const currency = pick(CURRENCY_CYCLE, i);
    const decimals = ST_CURRENCY_META[currency].decimals;
    const major = decimals === 0 ? 1200 + ((i * 457) % 48000) : 18 + ((i * 937) % 90000) / 100;
    const amountMinor = Math.round(major * 10 ** decimals);
    const day = 1 + ((i * 5 + 2) % 28);
    const hour = String(8 + ((i * 3) % 14)).padStart(2, '0');
    const minute = String((i * 17) % 60).padStart(2, '0');
    const createdAt = `2026-08-${String(day).padStart(2, '0')} ${hour}:${minute}`;
    const risk: StRiskLevel = i % 11 === 4 ? 'high' : i % 7 === 3 ? 'elevated' : 'normal';
    const customer = pick(CUSTOMERS, i);
    const description = pick(DESCRIPTIONS, i + Math.floor(i / CUSTOMERS.length));
    const domain = pick(EMAIL_DOMAINS, i);
    const brand = pick(ST_BRANDS, i);
    return {
      id: `TX-${1001 + i}`,
      amountMinor,
      currency,
      status,
      customer,
      email: `${domain}${1001 + i}@shop.example.com`,
      brand,
      last4: String(1000 + ((i * 373) % 9000)).slice(-4),
      risk,
      description,
      createdAt,
      timeline: buildTimeline(status, createdAt, i % 40),
      metadata: [
        { label: '订单号', value: `SO-2026${String(8100 + i)}` },
        { label: '交易渠道', value: pick(CHANNELS, i) },
        { label: '收据编号', value: `RC-${2600 + i}-A` },
        { label: '结算币种', value: currency },
      ],
    } satisfies StPayment;
  });
}

/** 金额显示：币种符号 + 千分位 + 按币种小数位（I7；mock 预计算口径）。 */
export function formatStAmount(currency: StCurrency, amountMinor: number): string {
  const meta = ST_CURRENCY_META[currency];
  const value = amountMinor / 10 ** meta.decimals;
  const text = value.toLocaleString('en-US', {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });
  return `${meta.symbol}${text}`;
}

export function formatStDateLabel(createdAt: string): string {
  const [day, clock] = createdAt.split(' ');
  const [, m, d] = (day ?? '').split('-');
  if (!m || !d) return createdAt;
  return `${Number(m)}月${Number(d)}日 ${clock ?? ''}`.trimEnd();
}

export function toStPaymentRow(record: StPayment): StPaymentRow {
  const statusMeta = ST_STATUS_META[record.status];
  const riskMeta = ST_RISK_META[record.risk];
  return {
    ...record,
    statusLabel: statusMeta.label,
    statusPillClass: statusMeta.pillClass,
    amountLabel: formatStAmount(record.currency, record.amountMinor),
    methodLabel: `${record.brand} •••• ${record.last4}`,
    dateLabel: formatStDateLabel(record.createdAt),
    riskLabel: riskMeta.label,
    riskChipClass: riskMeta.chipClass,
  };
}

/** st-status-unknown：非枚举 status 一律忽略（返回兜底全量形态）。 */
export function isStStatus(value: string | undefined): value is StPaymentStatus {
  return value === 'succeeded' || value === 'pending' || value === 'failed' || value === 'refunded';
}

/**
 * st-range（P7b I2）：样本数据月 = 2026-08 = 复刻语义「上月」（与导出 dialog
 * 「上月（8月1日 - 8月31日）」文案一致）；`prev`/`mtd` 落在数据月之外 → 空集，
 * 其余值（含未知值 st-filter-unknown 口径）全量兜底。
 */
export function isStEmptyRange(range: string | undefined): boolean {
  return range === 'prev' || range === 'mtd';
}

function stAmountMajor(record: StPayment): number {
  return record.amountMinor / 10 ** ST_CURRENCY_META[record.currency].decimals;
}

export function filterStPayments(
  records: StPayment[],
  keyword?: string,
  status?: string,
  minAmount?: string,
  range?: string,
): StPayment[] {
  if (isStEmptyRange(range)) return [];
  let rows = records;
  if (isStStatus(status)) {
    rows = rows.filter((r) => r.status === status);
  }
  const min = Number(minAmount);
  if (minAmount !== undefined && minAmount !== '' && !Number.isNaN(min)) {
    rows = rows.filter((r) => stAmountMajor(r) >= min);
  }
  const key = keyword?.trim().toLowerCase() ?? '';
  if (!key) return rows;
  return rows.filter(
    (r) =>
      r.customer.toLowerCase().includes(key) ||
      r.email.toLowerCase().includes(key) ||
      r.id.toLowerCase().includes(key) ||
      r.description.toLowerCase().includes(key) ||
      r.brand.toLowerCase().includes(key),
  );
}

export function paginateStPayments(
  rows: StPayment[],
  page: number,
  perPage: number,
): StPaymentsPayload {
  const size = Math.max(1, perPage);
  const current = Math.max(1, page);
  const start = (current - 1) * size;
  const items = rows.slice(start, start + size).map(toStPaymentRow);
  return {
    items,
    total: rows.length,
    page: current,
    perPage: size,
    pages: Math.ceil(rows.length / size),
  };
}
