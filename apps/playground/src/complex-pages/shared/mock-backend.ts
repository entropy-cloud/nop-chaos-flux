/**
 * Shared in-memory mock backend for the Complex Pages showcase.
 *
 * Each entity mimics the nop `findPage` / `get` / `save` / `delete`
 * conventions used by the standalone crud-demo so that pages can drive a
 * realistic loadAction / submitAction data flow without a server.
 *
 * Datasets are sized so that paginated tables have at least 3 pages
 * with the default page size of 10.
 */

export interface DeptNode {
  id: string;
  name: string;
  parentId: string | null;
}

export interface TagRecord {
  id: string;
  name: string;
  category: string;
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
  tagIds?: string[];
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
  tags: TagRecord[];
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

const DEPARTMENT_NAMES = '研发中心,产品中心,运营中心,华南分公司,前端组,后端组,深圳研发,采购部,财务部,人力资源,市场部,客服中心,质量管理,仓储物流,行政管理,信息技术'.split(',');
const ORDER_STATUSES: OrderRecord['status'][] = ['pending', 'paid', 'shipped', 'done', 'cancelled'];
const CHANNELS: OrderRecord['channel'][] = ['web', 'app', 'store'];
const COMPANIES = '上海示例科技,北京示例贸易,深圳示例零售,广州示例电商,杭州示例传媒,成都示例教育,武汉示例物流,南京示例金融,苏州示例制造,重庆示例医药,天津示例能源,厦门示例航空'.split(',');
const USER_NAMES = '张三,李四,王五,Alice,Bob,Carol,David,Eve,赵六,孙七,周八,吴九,郑十,冯十一,陈十二,林十三,何十四,黄十五,刘十六,杨十七,朱十八,马十九,罗二十,梁廿一,宋廿二,唐廿三,韩廿四,曹廿五,许廿六,邓廿七,彭廿八,曾廿九,萧三十'.split(',');
const SKUS = [
  { sku: 'SKU-A01', name: '示例商品 A', price: 440.25 },
  { sku: 'SKU-A02', name: '示例商品 B', price: 400 },
  { sku: 'SKU-B01', name: '示例商品 C', price: 1120 },
  { sku: 'SKU-C01', name: '示例商品 D', price: 2450 },
  { sku: 'SKU-D01', name: '示例商品 E', price: 180 },
  { sku: 'SKU-D02', name: '示例商品 F', price: 560 },
];
const TASK_TEMPLATES = [
  { title: '采购申请 — %s', reason: '季度采购计划，预算内执行' },
  { title: '差旅报销 — %s', reason: '客户现场对接及差旅费用报销' },
  { title: '合同用印 — %s', reason: '业务合同用印审批' },
  { title: '活动预算 — %s', reason: '市场活动预算申请' },
  { title: '招聘申请 — %s', reason: '团队编制扩充招聘' },
  { title: '固定资产 — %s', reason: '固定资产采购申请' },
];
const APPLICANTS = '张三,李四,王五,Alice,Bob,赵六,孙七,周八'.split(',');

function pad2(n: number) { return String(n).padStart(2, '0'); }

function ts(day: number, hour: number, min: number) {
  return `2024-07-${pad2((day % 31) + 1)} ${pad2(8 + (hour % 12))}:${pad2(min % 60)}:00`;
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
    { id: 'd3', name: '华北分公司', parentId: null },
    { id: 'd3-1', name: '北京研发', parentId: 'd3' },
    { id: 'd3-2', name: '天津销售', parentId: 'd3' },
    { id: 'd4', name: '西南分公司', parentId: null },
    { id: 'd4-1', name: '成都研发', parentId: 'd4' },
    { id: 'd4-2', name: '重庆运营', parentId: 'd4' },
    { id: 'd5', name: '华东分公司', parentId: null },
    { id: 'd5-1', name: '上海研发', parentId: 'd5' },
    { id: 'd5-2', name: '杭州产品', parentId: 'd5' },
    { id: 'd5-3', name: '南京销售', parentId: 'd5' },
    { id: 'd5-4', name: '苏州制造', parentId: 'd5' },
    { id: 'd6', name: '华中分公司', parentId: null },
    { id: 'd6-1', name: '武汉物流', parentId: 'd6' },
    { id: 'd6-2', name: '长沙客服', parentId: 'd6' },
    { id: 'd7', name: '东北分公司', parentId: null },
    { id: 'd7-1', name: '沈阳制造', parentId: 'd7' },
    { id: 'd7-2', name: '大连港口', parentId: 'd7' },
    { id: 'd8', name: '西北分公司', parentId: null },
    { id: 'd8-1', name: '西安研发', parentId: 'd8' },
    { id: 'd8-2', name: '兰州能源', parentId: 'd8' },
    { id: 'd9', name: '海外事业部', parentId: null },
    { id: 'd9-1', name: '北美区', parentId: 'd9' },
    { id: 'd9-2', name: '欧洲区', parentId: 'd9' },
    { id: 'd9-3', name: '东南亚区', parentId: 'd9' },
    { id: 'd10', name: '采购中心', parentId: null },
    { id: 'd11', name: '财务管理部', parentId: null },
    { id: 'd12', name: '人力资源部', parentId: null },
  ];
  const deptIds = depts.map((d) => d.id);

  const TAG_NAMES = 'VIP客户,高活跃,待跟进,已签约,流失风险,潜在用户,企业版,个人版,试用中,已过期,北区,南区,东区,西区,重点客户,战略伙伴,供应商,分销商,内部员工,外部合作,技术导向,业务导向,管理岗,一线员工,新入职,老员工,远程办公,常驻办公,合同制,实习生'.split(',');
  const TAG_CATEGORIES = '客户属性,状态,区域,等级,角色'.split(',');
  const tags: TagRecord[] = TAG_NAMES.map((name, i) => ({
    id: `t${i + 1}`,
    name,
    category: TAG_CATEGORIES[i % TAG_CATEGORIES.length],
  }));

  const users: UserRecord[] = USER_NAMES.map((name, i) => ({
    id: i + 1,
    name,
    email: `${name.toLowerCase()}@example.com`,
    gender: i % 2 === 0 ? '1' : '0',
    status: i % 4 === 3 ? '0' : '1',
    deptId: deptIds[i % deptIds.length],
    role: (['admin', 'user', 'guest'] as const)[i % 3],
    createTime: `2024-${pad2((i % 12) + 1)}-${pad2((i % 28) + 1)} ${pad2(8 + (i % 9))}:${pad2((i * 7) % 60)}:00`,
    tagIds: [`t${(i % 30) + 1}`, `t${((i + 5) % 30) + 1}`],
  }));

  const orders: OrderRecord[] = [];
  const orderItems: OrderItem[] = [];
  const orderLogs: OrderLog[] = [];
  const addresses: AddressRecord[] = [];
  const payments: PaymentRecord[] = [];
  const shipments: ShipmentRecord[] = [];

  for (let i = 0; i < 30; i++) {
    const oid = `o${i + 1}`;
    const status = ORDER_STATUSES[i % ORDER_STATUSES.length];
    const channel = CHANNELS[i % CHANNELS.length];
    const day = i;
    orders.push({
      id: oid,
      orderNo: `NO-202407${pad2(i + 1)}`,
      customer: COMPANIES[i % COMPANIES.length],
      amount: +(1280.5 + i * 312.7).toFixed(2),
      status,
      channel,
      createTime: ts(day, i, i * 7),
    });

    const itemCount = (i % 3) + 1;
    for (let j = 0; j < itemCount; j++) {
      const sku = SKUS[(i + j) % SKUS.length];
      orderItems.push({
        id: `i${i * 3 + j + 1}`,
        orderId: oid,
        sku: sku.sku,
        name: sku.name,
        qty: ((i + j) % 5) + 1,
        price: sku.price,
      });
    }

    orderLogs.push({
      id: `l${i * 2 + 1}`,
      orderId: oid,
      action: '创建订单',
      operator: '系统',
      time: ts(day, i, i * 7),
    });

    addresses.push({
      id: `a${i + 1}`,
      orderId: oid,
      recipient: USER_NAMES[i % USER_NAMES.length],
      phone: `138${pad2(i)}${pad2(i * 7 % 10000)}`,
      address: `${COMPANIES[i % COMPANIES.length]}大厦`,
      isDefault: true,
    });

    if (status !== 'pending' && status !== 'cancelled') {
      payments.push({
        id: `p${i + 1}`,
        orderId: oid,
        method: (['alipay', 'wechat', 'card', 'balance'] as const)[i % 4],
        amount: orders[i].amount,
        status: status === 'paid' ? 'pending' : 'success' as const,
        time: ts(day + 1, i + 2, i * 13),
      });
    }

    if (status === 'shipped' || status === 'done') {
      shipments.push({
        id: `s${i + 1}`,
        orderId: oid,
        station: `${['上海', '北京', '深圳', '广州'][i % 4]}转运中心`,
        description: '已揽收',
        time: ts(day + 2, i + 3, i * 17),
      });
    }
  }

  const budgets: BudgetRow[] = Array.from({ length: 30 }, (_, i) => ({
    id: `b${i + 1}`,
    department: DEPARTMENT_NAMES[i % DEPARTMENT_NAMES.length],
    q1: 40 + i * 20,
    q2: 55 + i * 18,
    q3: 50 + i * 15,
    q4: 60 + i * 22,
  }));

  const approvalTasks: ApprovalTask[] = [];
  for (let i = 0; i < 30; i++) {
    const tmpl = TASK_TEMPLATES[i % TASK_TEMPLATES.length];
    const applicant = APPLICANTS[i % APPLICANTS.length];
    approvalTasks.push({
      id: `t${i + 1}`,
      title: tmpl.title.replace('%s', ['服务器', '办公耗材', '软件授权', '网络设备', '办公家具', '云服务'][i % 6]),
      applicant,
      department: DEPARTMENT_NAMES[i % DEPARTMENT_NAMES.length],
      amount: +(3200 + i * 850).toFixed(2),
      status: (['pending', 'pending', 'pending', 'approved', 'rejected'] as const)[i % 5],
      submitTime: ts(i, i + 1, i * 11),
      reason: tmpl.reason,
    });
  }

  return { depts, tags, users, orders, orderItems, orderLogs, addresses, budgets, payments, shipments, approvalTasks };
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
