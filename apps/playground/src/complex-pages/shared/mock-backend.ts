/**
 * Shared in-memory mock backend for the Complex Pages showcase.
 *
 * Each entity mimics the nop `findPage` / `get` / `save` / `delete`
 * conventions used by the standalone crud-demo so that pages can drive a
 * realistic loadAction / submitAction data flow without a server.
 *
 * Datasets are intentionally small but rich enough to demonstrate filtering,
 * pagination, master-detail linkage and multi-sub-table composition.
 */

export interface DeptNode {
  id: string;
  name: string;
  parentId: string | null;
}

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  gender: '1' | '0';
  status: '1' | '0';
  deptId: string;
  role: 'admin' | 'user' | 'guest';
  createTime: string;
}

export interface OrderRecord {
  id: string;
  orderNo: string;
  customer: string;
  amount: number;
  status: 'pending' | 'paid' | 'shipped' | 'done' | 'cancelled';
  channel: 'web' | 'app' | 'store';
  createTime: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  sku: string;
  name: string;
  qty: number;
  price: number;
}

export interface OrderLog {
  id: string;
  orderId: string;
  action: string;
  operator: string;
  time: string;
}

export interface AddressRecord {
  id: string;
  orderId: string;
  recipient: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

export interface BudgetRow {
  id: string;
  department: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  method: 'alipay' | 'wechat' | 'card' | 'balance';
  amount: number;
  status: 'success' | 'pending' | 'failed';
  time: string;
}

export interface ShipmentRecord {
  id: string;
  orderId: string;
  station: string;
  description: string;
  time: string;
}

export interface ApprovalTask {
  id: string;
  title: string;
  applicant: string;
  department: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  submitTime: string;
  reason: string;
}

function nowStamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function clone<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  user: '用户',
  guest: '访客',
};
const STATUS_LABELS: Record<string, string> = { '1': '启用', '0': '禁用' };
const GENDER_LABELS: Record<string, string> = { '1': '男', '0': '女' };

/** List responses return dict fields as {value,label} so dotted column
 *  paths (e.g. status_label / role.label) render labels without extra code. */
export function toUserListRecord(record: UserRecord) {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    gender: record.gender,
    status: record.status,
    status_label: STATUS_LABELS[record.status] ?? record.status,
    gender_label: GENDER_LABELS[record.gender] ?? record.gender,
    role: { value: record.role, label: ROLE_LABELS[record.role] ?? record.role },
    deptId: record.deptId,
    createTime: record.createTime,
  };
}

export function toOrderListRecord(record: OrderRecord) {
  const STATUS_LABELS_O: Record<string, string> = {
    pending: '待付款',
    paid: '已付款',
    shipped: '已发货',
    done: '已完成',
    cancelled: '已取消',
  };
  const CHANNEL_LABELS: Record<string, string> = {
    web: '官网',
    app: 'APP',
    store: '门店',
  };
  return {
    ...record,
    status_label: STATUS_LABELS_O[record.status] ?? record.status,
    channel_label: CHANNEL_LABELS[record.channel] ?? record.channel,
  };
}

export interface MockDatabase {
  depts: DeptNode[];
  users: UserRecord[];
  orders: OrderRecord[];
  orderItems: OrderItem[];
  orderLogs: OrderLog[];
  addresses: AddressRecord[];
  budgets: BudgetRow[];
  payments: PaymentRecord[];
  shipments: ShipmentRecord[];
  approvalTasks: ApprovalTask[];
}

export function createMockDatabase(): MockDatabase {
  const depts: DeptNode[] = [
    { id: 'd1', name: '总公司', parentId: null },
    { id: 'd1-1', name: '研发中心', parentId: 'd1' },
    { id: 'd1-1-1', name: '前端组', parentId: 'd1-1' },
    { id: 'd1-1-2', name: '后端组', parentId: 'd1-1' },
    { id: 'd1-2', name: '产品中心', parentId: 'd1' },
    { id: 'd1-3', name: '运营中心', parentId: 'd1' },
    { id: 'd2', name: '华南分公司', parentId: null },
    { id: 'd2-1', name: '深圳研发', parentId: 'd2' },
  ];

  const users: UserRecord[] = [
    { id: 1, name: '张三', email: 'zhangsan@example.com', gender: '1', status: '1', deptId: 'd1-1-1', role: 'admin', createTime: '2024-01-05 09:30:00' },
    { id: 2, name: '李四', email: 'lisi@example.com', gender: '1', status: '1', deptId: 'd1-1-2', role: 'user', createTime: '2024-02-12 14:20:00' },
    { id: 3, name: '王五', email: 'wangwu@example.com', gender: '0', status: '0', deptId: 'd1-2', role: 'user', createTime: '2024-03-08 11:05:00' },
    { id: 4, name: 'Alice', email: 'alice@example.com', gender: '0', status: '1', deptId: 'd1-1-1', role: 'admin', createTime: '2024-06-03 09:00:00' },
    { id: 5, name: 'Bob', email: 'bob@example.com', gender: '1', status: '1', deptId: 'd2-1', role: 'user', createTime: '2024-06-19 15:25:00' },
    { id: 6, name: 'Carol', email: 'carol@example.com', gender: '0', status: '1', deptId: 'd1-3', role: 'guest', createTime: '2024-07-01 08:40:00' },
    { id: 7, name: 'David', email: 'david@example.com', gender: '1', status: '0', deptId: 'd1-1-2', role: 'user', createTime: '2024-08-22 10:10:00' },
    { id: 8, name: 'Eve', email: 'eve@example.com', gender: '0', status: '1', deptId: 'd2-1', role: 'admin', createTime: '2024-09-15 16:30:00' },
  ];

  const orders: OrderRecord[] = [
    { id: 'o1', orderNo: 'NO-20240701-0001', customer: '上海示例科技', amount: 1280.5, status: 'done', channel: 'web', createTime: '2024-07-01 10:15:00' },
    { id: 'o2', orderNo: 'NO-20240703-0002', customer: '北京示例贸易', amount: 5600, status: 'shipped', channel: 'app', createTime: '2024-07-03 09:42:00' },
    { id: 'o3', orderNo: 'NO-20240705-0003', customer: '深圳示例零售', amount: 320.8, status: 'paid', channel: 'store', createTime: '2024-07-05 14:05:00' },
    { id: 'o4', orderNo: 'NO-20240708-0004', customer: '广州示例电商', amount: 9800, status: 'pending', channel: 'web', createTime: '2024-07-08 18:20:00' },
    { id: 'o5', orderNo: 'NO-20240710-0005', customer: '杭州示例传媒', amount: 1500, status: 'cancelled', channel: 'app', createTime: '2024-07-10 11:30:00' },
    { id: 'o6', orderNo: 'NO-20240712-0006', customer: '成都示例教育', amount: 760, status: 'done', channel: 'store', createTime: '2024-07-12 08:55:00' },
    { id: 'o7', orderNo: 'NO-20240715-0007', customer: '武汉示例物流', amount: 4300, status: 'paid', channel: 'web', createTime: '2024-07-15 13:10:00' },
  ];

  const orderItems: OrderItem[] = [
    { id: 'i1', orderId: 'o1', sku: 'SKU-A01', name: '示例商品 A', qty: 2, price: 440.25 },
    { id: 'i2', orderId: 'o1', sku: 'SKU-A02', name: '示例商品 B', qty: 1, price: 400 },
    { id: 'i3', orderId: 'o2', sku: 'SKU-B01', name: '示例商品 C', qty: 5, price: 1120 },
    { id: 'i4', orderId: 'o3', sku: 'SKU-A01', name: '示例商品 A', qty: 1, price: 320.8 },
    { id: 'i5', orderId: 'o4', sku: 'SKU-C01', name: '示例商品 D', qty: 4, price: 2450 },
    { id: 'i6', orderId: 'o6', sku: 'SKU-B01', name: '示例商品 C', qty: 2, price: 380 },
  ];

  const orderLogs: OrderLog[] = [
    { id: 'l1', orderId: 'o1', action: '创建订单', operator: '系统', time: '2024-07-01 10:15:00' },
    { id: 'l2', orderId: 'o1', action: '支付成功', operator: '张三', time: '2024-07-01 10:30:00' },
    { id: 'l3', orderId: 'o1', action: '发货', operator: '李四', time: '2024-07-02 09:00:00' },
    { id: 'l4', orderId: 'o1', action: '完成', operator: '系统', time: '2024-07-04 12:00:00' },
    { id: 'l5', orderId: 'o2', action: '创建订单', operator: '系统', time: '2024-07-03 09:42:00' },
    { id: 'l6', orderId: 'o2', action: '支付成功', operator: '王五', time: '2024-07-03 10:00:00' },
    { id: 'l7', orderId: 'o2', action: '发货', operator: '李四', time: '2024-07-04 08:20:00' },
    { id: 'l8', orderId: 'o4', action: '创建订单', operator: '系统', time: '2024-07-08 18:20:00' },
  ];

  const addresses: AddressRecord[] = [
    { id: 'a1', orderId: 'o1', recipient: '张三', phone: '13800000001', address: '上海市浦东新区示例路 1 号', isDefault: true },
    { id: 'a2', orderId: 'o2', recipient: '王五', phone: '13800000003', address: '深圳市南山区示例大道 88 号', isDefault: false },
    { id: 'a3', orderId: 'o4', recipient: '赵六', phone: '13800000004', address: '广州市天河区示例街 12 号', isDefault: true },
  ];

  const budgets: BudgetRow[] = [
    { id: 'b1', department: '研发中心', q1: 120, q2: 150, q3: 130, q4: 160 },
    { id: 'b2', department: '产品中心', q1: 80, q2: 90, q3: 85, q4: 100 },
    { id: 'b3', department: '运营中心', q1: 60, q2: 70, q3: 65, q4: 80 },
    { id: 'b4', department: '华南分公司', q1: 40, q2: 55, q3: 50, q4: 60 },
  ];

  const payments: PaymentRecord[] = [
    { id: 'p1', orderId: 'o1', method: 'alipay', amount: 1280.5, status: 'success', time: '2024-07-01 10:30:00' },
    { id: 'p2', orderId: 'o2', method: 'wechat', amount: 5600, status: 'success', time: '2024-07-03 10:00:00' },
    { id: 'p3', orderId: 'o3', method: 'card', amount: 320.8, status: 'success', time: '2024-07-05 14:30:00' },
    { id: 'p4', orderId: 'o4', method: 'balance', amount: 9800, status: 'pending', time: '2024-07-08 18:25:00' },
    { id: 'p5', orderId: 'o6', method: 'alipay', amount: 760, status: 'success', time: '2024-07-12 09:10:00' },
  ];

  const shipments: ShipmentRecord[] = [
    { id: 's1', orderId: 'o1', station: '上海转运中心', description: '已揽收', time: '2024-07-01 16:00:00' },
    { id: 's2', orderId: 'o1', station: '上海浦东', description: '已出库', time: '2024-07-01 20:30:00' },
    { id: 's3', orderId: 'o1', station: '目的地城市', description: '已到达', time: '2024-07-03 09:00:00' },
    { id: 's4', orderId: 'o1', station: '派送站点', description: '派送中', time: '2024-07-04 08:00:00' },
    { id: 's5', orderId: 'o2', station: '深圳转运中心', description: '已揽收', time: '2024-07-04 08:30:00' },
    { id: 's6', orderId: 'o2', station: '途中', description: '运输中', time: '2024-07-05 10:00:00' },
  ];

  const approvalTasks: ApprovalTask[] = [
    { id: 't1', title: '采购申请 — 服务器扩容', applicant: '张三', department: '研发中心', amount: 86000, status: 'pending', submitTime: '2024-07-08 09:15:00', reason: 'Q3 流量增长，需扩容 4 台服务器' },
    { id: 't2', title: '差旅报销 — 客户拜访', applicant: '李四', department: '产品中心', amount: 3200, status: 'pending', submitTime: '2024-07-08 11:40:00', reason: '北京客户现场对接 3 天' },
    { id: 't3', title: '合同用印 — 销售合同', applicant: '王五', department: '运营中心', amount: 120000, status: 'pending', submitTime: '2024-07-07 16:20:00', reason: '年度框架合同用印审批' },
    { id: 't4', title: '采购申请 — 办公耗材', applicant: 'Alice', department: '研发中心', amount: 5400, status: 'approved', submitTime: '2024-07-05 10:00:00', reason: '季度耗材补充' },
    { id: 't5', title: '活动预算 — 产品发布会', applicant: 'Bob', department: '运营中心', amount: 45000, status: 'rejected', submitTime: '2024-07-04 14:30:00', reason: '发布会场地与物料预算' },
  ];

  return { depts, users, orders, orderItems, orderLogs, addresses, budgets, payments, shipments, approvalTasks };
}

export interface FetcherApi {
  url?: string;
  method?: string;
  data?: unknown;
  params?: unknown;
}

export interface TreeOption {
  value: string;
  label: string;
  children?: TreeOption[];
}

/** Build nested {value,label,children} options from the flat dept list. */
export function buildDeptTreeOptions(db: MockDatabase): TreeOption[] {
  const byParent = new Map<string | null, DeptNode[]>();
  for (const d of db.depts) {
    const list = byParent.get(d.parentId) ?? [];
    list.push(d);
    byParent.set(d.parentId, list);
  }
  const build = (parentId: string | null): TreeOption[] => {
    const nodes = byParent.get(parentId) ?? [];
    return nodes.map((n) => {
      const children = build(n.id);
      return {
        value: n.id,
        label: n.name,
        ...(children.length > 0 ? { children } : {}),
      };
    });
  };
  return build(null);
}

/** Collect descendant dept ids (inclusive) for tree-filtering users. */
export function collectDeptSubtree(db: MockDatabase, deptId: string | null): Set<string> {
  const result = new Set<string>();
  if (!deptId) return result;
  const stack = [deptId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (result.has(current)) continue;
    result.add(current);
    for (const d of db.depts) {
      if (d.parentId === current) stack.push(d.id);
    }
  }
  return result;
}

export const DICT_ROLE = [
  { label: '管理员', value: 'admin' },
  { label: '用户', value: 'user' },
  { label: '访客', value: 'guest' },
];
export const DICT_USER_STATUS = [
  { label: '启用', value: '1' },
  { label: '禁用', value: '0' },
];

export const MOCK_DICTS: Record<string, Array<{ label: string; value: string }>> = {
  role: DICT_ROLE,
  userStatus: DICT_USER_STATUS,
};

export { nowStamp };
