/**
 * Ant Design Pro replica mock data + helpers (plan 2026-08-29-1240-1 P2a).
 *
 * Extracted into its own module per the P1 replication spec hard rule 1
 * (`mock-backend.ts` must stay ≤500 lines). Datasets are deterministic
 * (index arithmetic only) so e2e runs are stable, sized ≥3 pages at the
 * default pageSize 10, and structurally real: field types cover the states
 * the analysis §4 interaction list needs (status/amount/date/owner).
 *
 * All copy is original self-authored Chinese; no Ant Design Pro sample data.
 */

export type AntdProOrderStatus = 'pending' | 'processing' | 'shipped' | 'done' | 'cancelled';
export type AntdProChannel = 'web' | 'miniapp' | 'store' | 'app';

export interface AntdProOrder {
  id: string;
  orderNo: string;
  customer: string;
  channel: AntdProChannel;
  payType: string;
  amount: number;
  status: AntdProOrderStatus;
  owner: string;
  createdAt: string;
}

export interface AntdProOrderListRow extends AntdProOrder {
  statusLabel: string;
  channelLabel: string;
  amountText: string;
}

export interface AntdProOrderDetail {
  id: string;
  orderNo: string;
  status: AntdProOrderStatus;
  statusLabel: string;
  amountText: string;
  progressKey: string;
  basic: { orderNo: string; channelLabel: string; payType: string; createdAt: string; owner: string };
  customer: { name: string; contact: string; phone: string; region: string };
  payment: { method: string; tradeNo: string; paidAt: string; invoiceTitle: string };
  shipment: { company: string; trackingNo: string; shippedAt: string; receiver: string; address: string };
  approval: { approver: string; submittedAt: string; comment: string };
  timeline: Array<{ time: string; action: string; operator: string }>;
}

export interface AntdProDashboard {
  kpi: { todaySales: number; monthSales: number; totalOrders: number; pendingOrders: number };
  trend: Array<{ date: string; sales: number; orders: number }>;
  channels: Array<{ name: string; value: number }>;
  topProducts: Array<{ rank: number; name: string; category: string; sales: number }>;
}

export const ANTDPRO_STATUS_LABELS: Record<AntdProOrderStatus, string> = {
  pending: '待付款',
  processing: '备货中',
  shipped: '配送中',
  done: '已完成',
  cancelled: '已关闭',
};

export const ANTDPRO_CHANNEL_LABELS: Record<AntdProChannel, string> = {
  web: '官网',
  miniapp: '小程序',
  store: '门店',
  app: 'App',
};

const CUSTOMERS = [
  '杭州云澈服饰有限公司',
  '南京青禾文创工作室',
  '苏州栖霞家居生活馆',
  '深圳南山数码专营店',
  '成都锦里茶饮供应链',
  '武汉江畔图书发行',
  '上海浦江健身器材',
  '广州白云美妆集合',
  '北京望京烘焙工坊',
  '厦门鹭岛母婴用品',
  '青岛帆影户外装备',
  '长沙星城宠物服务',
];

const OWNERS = ['陈立群', '苏婉清', '顾北辰', '林知夏'];
const PAY_TYPES = ['在线支付', '对公转账', '货到付款'];
const CHANNELS: AntdProChannel[] = ['web', 'miniapp', 'store', 'app'];
const STATUSES: AntdProOrderStatus[] = ['done', 'processing', 'pending', 'shipped', 'done', 'cancelled', 'done', 'shipped', 'done', 'processing'];

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

export function antdproAmountText(amount: number): string {
  return `¥ ${amount.toFixed(2)}`;
}

export function createAntdProOrders(): AntdProOrder[] {
  const rows: AntdProOrder[] = [];
  for (let i = 0; i < 36; i += 1) {
    const day = 1 + (i % 28);
    const hour = 9 + (i % 9);
    const minute = pad((i * 17) % 60, 2);
    rows.push({
      id: `A${1001 + i}`,
      orderNo: `SO202608${pad(100 + i, 4)}`,
      customer: CUSTOMERS[i % CUSTOMERS.length],
      channel: CHANNELS[i % CHANNELS.length],
      payType: PAY_TYPES[i % PAY_TYPES.length],
      amount: 128 + ((i * 137) % 2800),
      status: STATUSES[i % STATUSES.length],
      owner: OWNERS[i % OWNERS.length],
      createdAt: `2026-08-${pad(day, 2)} ${pad(hour, 2)}:${minute}`,
    });
  }
  return rows;
}

export function toAntdProOrderListRow(order: AntdProOrder): AntdProOrderListRow {
  return {
    ...order,
    statusLabel: ANTDPRO_STATUS_LABELS[order.status],
    channelLabel: ANTDPRO_CHANNEL_LABELS[order.channel],
    amountText: antdproAmountText(order.amount),
  };
}

export interface AntdProOrderFilter {
  keyword?: string;
  status?: string;
  channel?: string;
}

export function filterAntdProOrders(rows: AntdProOrder[], filter: AntdProOrderFilter): AntdProOrder[] {
  let result = rows.slice();
  const keyword = typeof filter.keyword === 'string' ? filter.keyword.trim().toLowerCase() : '';
  if (keyword) {
    result = result.filter(
      (r) => r.orderNo.toLowerCase().includes(keyword) || r.customer.toLowerCase().includes(keyword),
    );
  }
  if (filter.status) {
    result = result.filter((r) => r.status === filter.status);
  }
  if (filter.channel) {
    result = result.filter((r) => r.channel === filter.channel);
  }
  return result;
}

export function paginateAntdPro<T>(rows: T[], page: number, pageSize: number): { items: T[]; total: number; page: number; pageSize: number; pages: number } {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safeSize;
  return {
    items: rows.slice(start, start + safeSize),
    total: rows.length,
    page: safePage,
    pageSize: safeSize,
    pages: Math.max(1, Math.ceil(rows.length / safeSize)),
  };
}

export function findAntdProOrder(rows: AntdProOrder[], id: string): AntdProOrder | null {
  return rows.find((r) => r.id === id) ?? null;
}

const PROGRESS_BY_STATUS: Record<AntdProOrderStatus, string> = {
  pending: 'created',
  processing: 'confirmed',
  shipped: 'shipped',
  done: 'completed',
  cancelled: 'created',
};

export function buildAntdProOrderDetail(order: AntdProOrder): AntdProOrderDetail {
  const seq = Number(order.id.slice(1));
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    statusLabel: ANTDPRO_STATUS_LABELS[order.status],
    amountText: antdproAmountText(order.amount),
    progressKey: PROGRESS_BY_STATUS[order.status],
    basic: {
      orderNo: order.orderNo,
      channelLabel: ANTDPRO_CHANNEL_LABELS[order.channel],
      payType: order.payType,
      createdAt: order.createdAt,
      owner: order.owner,
    },
    customer: {
      name: order.customer,
      contact: order.owner,
      phone: `138${pad(seq * 7919 % 100000000, 8)}`,
      region: '华东大区',
    },
    payment: {
      method: order.payType,
      tradeNo: `TR${pad(seq * 211, 10)}`,
      paidAt: order.status === 'pending' ? '-' : order.createdAt,
      invoiceTitle: `${order.customer}`,
    },
    shipment: {
      company: '顺驰速运',
      trackingNo: `SF${pad(seq * 3571, 10)}`,
      shippedAt: order.status === 'shipped' || order.status === 'done' ? order.createdAt : '-',
      receiver: order.owner,
      address: '杭州市西湖区文三路 199 号创意产业园 3 号楼',
    },
    approval: {
      approver: '周砚秋',
      submittedAt: order.createdAt,
      comment: order.status === 'cancelled' ? '客户侧预算调整，经确认关闭该单。' : '常规订单，按标准流程执行。',
    },
    timeline: [
      { time: order.createdAt, action: '创建订单', operator: order.owner },
      { time: order.createdAt, action: '风控校验通过', operator: '系统' },
      { time: order.status === 'pending' ? '-' : order.createdAt, action: '财务确认收款', operator: '周砚秋' },
      { time: order.status === 'done' ? order.createdAt : '-', action: '客户签收完成', operator: order.owner },
    ],
  };
}

const TREND_SALES = [6800, 7200, 8100, 6400, 9200, 10400, 8600, 7800, 9900, 11200, 9400, 8800, 10600, 11800];
const TREND_ORDERS = [28, 31, 35, 26, 38, 44, 36, 33, 41, 47, 39, 37, 45, 49];

export function createAntdProDashboard(orders: AntdProOrder[]): AntdProDashboard {
  const byChannel = new Map<AntdProChannel, number>();
  for (const order of orders) {
    byChannel.set(order.channel, (byChannel.get(order.channel) ?? 0) + 1);
  }
  const products = [
    { name: '云雾绿茶礼盒', category: '茶饮' },
    { name: '陶瓷手冲壶', category: '器具' },
    { name: '冷萃挂耳组合', category: '茶饮' },
    { name: '胡桃木茶盘', category: '器具' },
    { name: '桂花乌龙罐装', category: '茶饮' },
    { name: '玻璃公道杯', category: '器具' },
    { name: '陈皮白茶饼', category: '茶饮' },
    { name: '棉麻茶席', category: '家居' },
    { name: '电陶炉mini', category: '器具' },
    { name: '闻香杯套装', category: '器具' },
  ];
  return {
    kpi: {
      todaySales: 11800,
      monthSales: TREND_SALES.reduce((sum, v) => sum + v, 0),
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === 'pending').length,
    },
    trend: TREND_SALES.map((sales, i) => ({
      date: `08-${pad(16 + i, 2)}`,
      sales,
      orders: TREND_ORDERS[i],
    })),
    channels: CHANNELS.map((channel) => ({
      name: ANTDPRO_CHANNEL_LABELS[channel],
      value: byChannel.get(channel) ?? 0,
    })),
    topProducts: products.map((p, i) => ({
      rank: i + 1,
      name: p.name,
      category: p.category,
      sales: 12800 - i * 960,
    })),
  };
}

export interface AntdProFetcherBranchInput {
  url: string;
  method: string;
  params: Record<string, unknown>;
  body: Record<string, unknown>;
}

/**
 * Build the get-only `/r/AntdPro__*` fetcher branch (plan 2026-08-29-1240-1
 * P2a). Kept here so `showcase-env.ts` stays under the 700-line hard gate:
 * the env wires this factory with a compact delegation instead of inlining
 * the branch bodies. Returns null when the request is not an AntdPro read.
 */
export function createAntdProFetcherBranch(orders: AntdProOrder[], clone: <T>(value: T) => T) {
  return function handleAntdProBranch<T>(input: AntdProFetcherBranchInput): { status: number; data: T } | null {
    const { url, method, params, body } = input;
    if (!url.includes('/r/AntdPro__') || method !== 'get') {
      return null;
    }
    const qs = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams();
    const read = (key: string): string | undefined => {
      const value = params[key] ?? body[key] ?? qs.get(key);
      return value === undefined || value === null ? undefined : String(value);
    };
    if (url.includes('/r/AntdPro__orders')) {
      const rows = filterAntdProOrders(orders, {
        keyword: read('keyword'),
        status: read('status'),
        channel: read('channel'),
      }).map(toAntdProOrderListRow);
      const paged = paginateAntdPro(rows, Number(read('page') ?? 1) || 1, Number(read('perPage') ?? 10) || 10);
      return { status: 0, data: clone(paged) as T };
    }
    if (url.includes('/r/AntdPro__orderDetail')) {
      const id = read('id') ?? '';
      const order = id ? findAntdProOrder(orders, id) : null;
      return { status: 0, data: clone(order ? buildAntdProOrderDetail(order) : null) as T };
    }
    if (url.includes('/r/AntdPro__dashboard')) {
      return { status: 0, data: clone(createAntdProDashboard(orders)) as T };
    }
    return null;
  };
}
