import type { RendererEnv } from '@nop-chaos/flux-core';
import { toast } from '@nop-chaos/ui';
import {
  buildDeptTreeOptions,
  clone,
  collectDeptSubtree,
  createMockDatabase,
  MOCK_DICTS,
  nowStamp,
  toOrderListRecord,
  toUserListRecord,
  type FetcherApi,
  type MockDatabase,
  type UserRecord,
} from './mock-backend';
import { confirmBridge } from './confirm-bridge';

function asRecord(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value !== '' && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}

function filterUsers(db: MockDatabase, params: Record<string, unknown>) {
  let rows = db.users.slice();

  const keyword = typeof params.keyword === 'string' ? params.keyword.trim() : '';
  if (keyword) {
    const lower = keyword.toLowerCase();
    rows = rows.filter(
      (u) =>
        u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower),
    );
  }

  const status = typeof params.status === 'string' ? params.status : '';
  if (status) rows = rows.filter((u) => u.status === status);

  const role = typeof params.role === 'string' ? params.role : '';
  if (role) rows = rows.filter((u) => u.role === role);

  const deptId = typeof params.deptId === 'string' ? params.deptId : '';
  if (deptId) {
    const subtree = collectDeptSubtree(db, deptId);
    rows = rows.filter((u) => subtree.has(u.deptId));
  }

  if (typeof params.minId === 'number' || typeof params.minId === 'string') {
    const min = asNumber(params.minId);
    if (min !== undefined) rows = rows.filter((u) => u.id >= min);
  }
  if (typeof params.maxId === 'number' || typeof params.maxId === 'string') {
    const max = asNumber(params.maxId);
    if (max !== undefined) rows = rows.filter((u) => u.id <= max);
  }
  if (typeof params.dateRange === 'string' && params.dateRange.includes(',')) {
    const [start, end] = params.dateRange.split(',');
    const s = start?.trim() ?? '';
    const e = end?.trim() ?? '';
    if (s || e) {
      rows = rows.filter((u) => {
        const day = u.createTime.slice(0, 10);
        return (!s || day >= s) && (!e || day <= e);
      });
    }
  }

  return rows;
}

function sortRows<T extends Record<string, unknown>>(rows: T[], orderBy?: string, orderDir?: string): T[] {
  if (!orderBy) return rows;
  const dir = orderDir === 'desc' ? -1 : 1;
  return rows.slice().sort((a, b) => {
    const av = a[orderBy];
    const bv = b[orderBy];
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

/**
 * Build a RendererEnv whose fetcher handles the full showcase endpoint set.
 * State is kept in a single in-memory database so that create/update/delete
 * are observable across pages within the same session.
 */
export function createShowcaseEnv(): { env: RendererEnv; db: MockDatabase } {
  const db = createMockDatabase();

  const fetcher = async function fetcher<T>(api: FetcherApi): Promise<{ status: number; data: T }> {
    const url = api.url ?? '';
    const method = (api.method ?? 'get').toLowerCase();
    const body = asRecord(api.data);
    const params = asRecord(api.params);

    // ----- Departments -----
    if (url.includes('/r/Dept__tree') && method === 'get') {
      const options = buildDeptTreeOptions(db);
      return { status: 0, data: clone({ items: options, total: options.length }) as T };
    }
    if (url.includes('/r/Department__findPage') && method === 'get') {
      const qs = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams();
      const page = Math.max(1, asNumber(qs.get('page')) ?? 1);
      const pageSize = Math.max(1, asNumber(qs.get('perPage')) ?? 10);
      const start = (page - 1) * pageSize;
      const paged = db.depts.slice(start, start + pageSize);
      return { status: 0, data: clone({ items: paged, total: db.depts.length }) as T };
    }
    if (url.includes('/r/Tag__findPage') && method === 'get') {
      const qs = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams();
      const page = Math.max(1, asNumber(qs.get('page')) ?? 1);
      const pageSize = Math.max(1, asNumber(qs.get('perPage')) ?? 10);
      const start = (page - 1) * pageSize;
      const paged = db.tags.slice(start, start + pageSize);
      return { status: 0, data: clone({ items: paged, total: db.tags.length }) as T };
    }

    // ----- Users -----
    if (url.includes('/r/User__findPage') && method === 'get') {
      const merged = { ...params, ...body };
      const rows = sortRows(
        filterUsers(db, merged).map(toUserListRecord),
        typeof merged.orderBy === 'string' ? merged.orderBy : undefined,
        typeof merged.orderDir === 'string' ? merged.orderDir : undefined,
      );
      return { status: 0, data: clone({ items: rows, total: rows.length }) as T };
    }
    if (url.includes('/r/User__get') && method === 'get') {
      const id = asNumber(body.id ?? params.id);
      const target = db.users.find((u) => u.id === id) ?? null;
      // Expose deptId under both names so schemas that use either field
      // (e.g. the reused crud-demo.json uses `departmentId`) bind correctly.
      const adapted = target ? { ...target, departmentId: target.deptId, tagIds: target.tagIds ?? [] } : null;
      return { status: 0, data: clone(adapted) as T };
    }
    if (url.includes('/r/User__save')) {
      const id = asNumber(body.id);
      if (id !== undefined) {
        const target = db.users.find((u) => u.id === id);
        if (target) {
          if (body.name !== undefined) target.name = String(body.name);
          if (body.email !== undefined) target.email = String(body.email);
          if (body.gender !== undefined) target.gender = body.gender as UserRecord['gender'];
          if (body.status !== undefined) target.status = body.status as UserRecord['status'];
          if (body.deptId !== undefined) target.deptId = String(body.deptId);
          else if (body.departmentId !== undefined) target.deptId = String(body.departmentId);
          if (body.role !== undefined) target.role = body.role as UserRecord['role'];
          if (body.tagIds !== undefined) target.tagIds = Array.isArray(body.tagIds) ? body.tagIds as string[] : [];
        }
      } else {
        const nextId = db.users.reduce((max, u) => Math.max(max, u.id), 0) + 1;
        db.users.push({
          id: nextId,
          name: String(body.name ?? ''),
          email: String(body.email ?? ''),
          gender: (body.gender as UserRecord['gender']) ?? '1',
          status: (body.status as UserRecord['status']) ?? '1',
          deptId: typeof body.deptId === 'string' ? body.deptId : 'd1',
          role: (body.role as UserRecord['role']) ?? 'user',
          createTime: nowStamp(),
          tagIds: Array.isArray(body.tagIds) ? body.tagIds as string[] : [],
        });
      }
      return { status: 0, data: clone({ success: true }) as T };
    }
    if (url.includes('/r/User__batchUpdate')) {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      for (const row of rows) {
        const r = asRecord(row);
        const id = asNumber(r.id);
        const target = db.users.find((u) => u.id === id);
        if (target) {
          if (r.name !== undefined) target.name = String(r.name);
          if (r.email !== undefined) target.email = String(r.email);
          if (r.role !== undefined) target.role = r.role as UserRecord['role'];
          if (r.status !== undefined) target.status = r.status as UserRecord['status'];
        }
      }
      return { status: 0, data: clone({ success: true, updated: rows.length }) as T };
    }
    if (url.includes('/r/User__delete')) {
      if (Array.isArray(body.ids)) {
        const idSet = new Set(body.ids.map((v) => asNumber(v)));
        for (let i = db.users.length - 1; i >= 0; i -= 1) {
          if (idSet.has(db.users[i].id)) db.users.splice(i, 1);
        }
      } else if (body.id !== undefined) {
        const targetId = asNumber(body.id);
        const index = db.users.findIndex((u) => u.id === targetId);
        if (index >= 0) db.users.splice(index, 1);
      }
      return { status: 0, data: clone({ success: true }) as T };
    }

    // ----- User export (BACKEND generates the file; client only receives a
    // download URL). The mock "backend" builds the CSV here so the demo never
    // concatenates table data in the browser. -----
    if (url.includes('/r/User__export')) {
      const rows = filterUsers(db, { ...asRecord(body.filter), ...body });
      const header = ['id', 'name', 'email', 'role', 'status', 'deptId', 'createTime'];
      const escape = (v: unknown) => {
        const s = v == null ? '' : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [header.join(','), ...rows.map((u) => header.map((k) => escape((u as unknown as Record<string, unknown>)[k])).join(','))].join('\n');
      const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent('\ufeff' + csv)}`;
      return {
        status: 0,
        data: clone({ url: dataUrl, filename: `users-${Date.now()}.csv`, count: rows.length }) as T,
      };
    }

    // ----- Approval tasks -----
    if (url.includes('/r/ApprovalTask__findPage') && method === 'get') {
      const STATUS_LABELS: Record<string, string> = { pending: '待审批', approved: '已通过', rejected: '已驳回' };
      const merged = { ...params, ...body };
      let rows = db.approvalTasks.slice();
      const status = typeof merged.status === 'string' ? merged.status : '';
      if (status) rows = rows.filter((t) => t.status === status);
      const keyword = typeof merged.keyword === 'string' ? merged.keyword.trim() : '';
      if (keyword) {
        const lower = keyword.toLowerCase();
        rows = rows.filter((t) => t.title.toLowerCase().includes(lower) || t.applicant.toLowerCase().includes(lower));
      }
      const items = rows.map((t) => ({ ...t, status_label: STATUS_LABELS[t.status] ?? t.status }));
      return { status: 0, data: clone({ items, total: items.length }) as T };
    }
    if (url.includes('/r/ApprovalTask__get') && method === 'get') {
      const id = typeof body.id === 'string' ? body.id : (typeof params.id === 'string' ? params.id : '');
      const target = db.approvalTasks.find((t) => t.id === id) ?? null;
      return { status: 0, data: clone(target) as T };
    }
    if (url.includes('/r/ApprovalTask__approve')) {
      const id = typeof body.id === 'string' ? body.id : '';
      const target = db.approvalTasks.find((t) => t.id === id);
      if (target) {
        target.status = 'approved';
        target.reason = typeof body.comment === 'string' && body.comment ? body.comment : target.reason;
      }
      return { status: 0, data: clone({ success: true }) as T };
    }
    if (url.includes('/r/ApprovalTask__reject')) {
      const id = typeof body.id === 'string' ? body.id : '';
      const target = db.approvalTasks.find((t) => t.id === id);
      if (target) {
        target.status = 'rejected';
        target.reason = typeof body.comment === 'string' && body.comment ? body.comment : target.reason;
      }
      return { status: 0, data: clone({ success: true }) as T };
    }

    // ----- Orders -----
    if (url.includes('/r/Order__pickerOptions') && method === 'get') {
      const items = db.orders.map((o) => ({ label: `${o.orderNo} · ${o.customer}`, value: o.id }));
      return { status: 0, data: clone({ items, total: items.length }) as T };
    }
    if (url.includes('/r/Order__get') && method === 'get') {
      const id = typeof body.id === 'string' ? body.id : (typeof params.id === 'string' ? params.id : '');
      const target = db.orders.find((o) => o.id === id) ?? null;
      return { status: 0, data: clone(target ? toOrderListRecord(target) : target) as T };
    }

    // ----- Order sub-tables -----
    // OrderItem CRUD — independent sub-table maintenance with inline edit.
    if (url.includes('/r/OrderItem__findPage') && method === 'post') {
      const orderId = typeof body.orderId === 'string' ? body.orderId : '';
      const items = db.orderItems
        .filter((i) => i.orderId === orderId)
        .map((i) => ({ ...i, subtotal: Number(((i.qty ?? 0) * (i.price ?? 0)).toFixed(2)) }));
      const page = Math.max(1, asNumber(body.page) ?? 1);
      const pageSize = Math.max(1, asNumber(body.pageSize) ?? 10);
      const start = (page - 1) * pageSize;
      const paged = items.slice(start, start + pageSize);
      return { status: 0, data: clone({ items: paged, total: items.length }) as T };
    }
    if (url.includes('/r/OrderItem__save') && method === 'post') {
      const source = (body.record && typeof body.record === 'object' ? body.record : body) as Record<string, unknown>;
      const id = typeof source.id === 'string' && source.id ? source.id : '';
      const existing = db.orderItems.find((i) => i.id === id);
      if (existing) {
        if (source.name !== undefined) existing.name = String(source.name);
        if (source.sku !== undefined) existing.sku = String(source.sku);
        const qty = asNumber(source.qty);
        if (qty !== undefined) existing.qty = qty;
        const price = asNumber(source.price);
        if (price !== undefined) existing.price = price;
      } else {
        const nextId = `i${db.orderItems.length + 1}`;
        db.orderItems.push({
          id: nextId,
          orderId: String(source.orderId ?? body.orderId ?? ''),
          sku: String(source.sku ?? ''),
          name: String(source.name ?? ''),
          qty: asNumber(source.qty) ?? 0,
          price: asNumber(source.price) ?? 0,
        });
      }
      return { status: 0, data: clone({ success: true }) as T };
    }
    if (url.includes('/r/OrderItem__delete')) {
      const id = typeof body.id === 'string' ? body.id : '';
      const index = db.orderItems.findIndex((i) => i.id === id);
      if (index >= 0) db.orderItems.splice(index, 1);
      return { status: 0, data: clone({ success: true }) as T };
    }
    if (url.includes('/r/OrderItem__find') && method === 'get') {
      const orderId = typeof body.orderId === 'string' ? body.orderId : (typeof params.orderId === 'string' ? params.orderId : '');
      const items = db.orderItems
        .filter((i) => i.orderId === orderId)
        .map((i) => ({ ...i, subtotal: Number(((i.qty ?? 0) * (i.price ?? 0)).toFixed(2)) }));
      return { status: 0, data: clone({ items, total: items.length }) as T };
    }
    if (url.includes('/r/OrderLog__find') && method === 'get') {
      const orderId = typeof body.orderId === 'string' ? body.orderId : (typeof params.orderId === 'string' ? params.orderId : '');
      const items = db.orderLogs.filter((l) => l.orderId === orderId);
      return { status: 0, data: clone({ items, total: items.length }) as T };
    }
    if (url.includes('/r/Address__find') && method === 'get') {
      const orderId = typeof body.orderId === 'string' ? body.orderId : (typeof params.orderId === 'string' ? params.orderId : '');
      const items = db.addresses
        .filter((a) => a.orderId === orderId)
        .map((a) => ({ ...a, isDefaultLabel: a.isDefault ? '是' : '否' }));
      return { status: 0, data: clone({ items, total: items.length }) as T };
    }
    if (url.includes('/r/Payment__find') && method === 'get') {
      const orderId = typeof body.orderId === 'string' ? body.orderId : (typeof params.orderId === 'string' ? params.orderId : '');
      const METHOD_LABELS: Record<string, string> = { alipay: '支付宝', wechat: '微信', card: '银行卡', balance: '余额' };
      const STATUS_LABELS: Record<string, string> = { success: '成功', pending: '处理中', failed: '失败' };
      const items = db.payments
        .filter((p) => p.orderId === orderId)
        .map((p) => ({
          ...p,
          method_label: METHOD_LABELS[p.method] ?? p.method,
          status_label: STATUS_LABELS[p.status] ?? p.status,
        }));
      return { status: 0, data: clone({ items, total: items.length }) as T };
    }
    if (url.includes('/r/Shipment__find') && method === 'get') {
      const orderId = typeof body.orderId === 'string' ? body.orderId : (typeof params.orderId === 'string' ? params.orderId : '');
      const items = db.shipments.filter((s) => s.orderId === orderId);
      return { status: 0, data: clone({ items, total: items.length }) as T };
    }

    // ----- Budget (inline edit) -----
    if (url.includes('/r/Budget__find') && method === 'get') {
      const items = db.budgets.map((b) => ({
        ...b,
        total: (b.q1 ?? 0) + (b.q2 ?? 0) + (b.q3 ?? 0) + (b.q4 ?? 0),
      }));
      return { status: 0, data: clone({ items, total: items.length }) as T };
    }
    if (url.includes('/r/Budget__save')) {
      const source = (body.record && typeof body.record === 'object' ? body.record : body) as Record<string, unknown>;
      const id = typeof source.id === 'string' ? source.id : '';
      const target = db.budgets.find((b) => b.id === id);
      if (target) {
        for (const key of ['q1', 'q2', 'q3', 'q4'] as const) {
          const v = asNumber(source[key]);
          if (v !== undefined) target[key] = v;
        }
      }
      return { status: 0, data: clone({ success: true }) as T };
    }
    if (url.includes('/r/Budget__batchSave')) {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      for (const row of rows) {
        const r = asRecord(row);
        const id = typeof r.id === 'string' ? r.id : '';
        const target = db.budgets.find((b) => b.id === id);
        if (target) {
          for (const key of ['q1', 'q2', 'q3', 'q4'] as const) {
            const v = asNumber(r[key]);
            if (v !== undefined) target[key] = v;
          }
        }
      }
      return { status: 0, data: clone({ success: true, updated: rows.length }) as T };
    }

    // ----- Dashboard aggregates -----
    if (url.includes('/r/Dashboard__summary') && method === 'get') {
      const totalOrders = db.orders.length;
      const active = db.orders.filter((o) => o.status === 'pending' || o.status === 'paid').length;
      const pending = db.orders.filter((o) => o.status === 'pending').length;
      const revenue = db.orders
        .filter((o) => o.status === 'done' || o.status === 'paid' || o.status === 'shipped')
        .reduce((sum, o) => sum + o.amount, 0);
      const userCount = db.users.length;
      const today = nowStamp().slice(0, 10);
      const todayOrders = db.orders.filter((o) => o.createTime.startsWith(today)).length;
      const avgOrderValue = totalOrders > 0 ? Math.round((revenue / totalOrders) * 100) / 100 : 0;
      return {
        status: 0,
        data: clone({ totalOrders, active, pending, revenue, userCount, todayOrders, avgOrderValue, monthGrowth: '12.5%' }) as T,
      };
    }
    if (url.includes('/r/Dashboard__trend') && method === 'get') {
      const byDate = new Map<string, number>();
      for (const o of db.orders) {
        const day = o.createTime.slice(0, 10);
        byDate.set(day, (byDate.get(day) ?? 0) + o.amount);
      }
      const items = Array.from(byDate.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([day, amount]) => ({ date: day, amount: Math.round(amount) }));
      return { status: 0, data: clone({ items, total: items.length }) as T };
    }
    if (url.includes('/r/Dashboard__daily') && method === 'get') {
      const byDate = new Map<string, { count: number; amount: number }>();
      for (const o of db.orders) {
        const day = o.createTime.slice(0, 10);
        const entry = byDate.get(day) ?? { count: 0, amount: 0 };
        entry.count += 1;
        entry.amount += o.amount;
        byDate.set(day, entry);
      }
      const items = Array.from(byDate.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, { count, amount }]) => ({ date, count, amount: Math.round(amount) }));
      return { status: 0, data: clone({ items, total: items.length }) as T };
    }
    if (url.includes('/r/Dashboard__category') && method === 'get') {
      const byChannel = new Map<string, number>();
      for (const o of db.orders) {
        byChannel.set(o.channel, (byChannel.get(o.channel) ?? 0) + 1);
      }
      const channelLabels: Record<string, string> = { web: '官网', app: 'APP', store: '门店' };
      const items = Array.from(byChannel.entries()).map(([channel, count]) => ({
        name: channelLabels[channel] ?? channel,
        value: count,
      }));
      return { status: 0, data: clone({ items, total: items.length }) as T };
    }
    if (url.includes('/r/Dashboard__recentOrders') && method === 'get') {
      const rows = db.orders
        .slice()
        .sort((a, b) => (a.createTime < b.createTime ? 1 : -1))
        .slice(0, 5)
        .map(toOrderListRecord);
      return { status: 0, data: clone({ items: rows, total: rows.length }) as T };
    }
    if (url.includes('/r/Dashboard__approvals') && method === 'get') {
      const STATUS_LABELS: Record<string, string> = { pending: '待审批', approved: '已通过', rejected: '已驳回' };
      const items = db.approvalTasks
        .filter((t) => t.status === 'pending')
        .map((t) => ({ ...t, status_label: STATUS_LABELS[t.status] }));
      return { status: 0, data: clone({ items, total: items.length }) as T };
    }

    // ----- Remote tab content (schema returned lazily via DynamicRenderer) -----
    if (url.includes('/r/RemoteTabContent')) {
      return {
        status: 0,
        data: {
          type: 'crud',
          testid: 'remote-tab-crud',
          source: '${remoteTabItems}',
          columns: [
            { name: 'id', label: '编号' },
            { name: 'name', label: '名称' },
            { name: 'value', label: '数值' },
          ],
        },
      } as { status: number; data: T };
    }

    return { status: 0, data: null as T };
  };

  const env: RendererEnv = {
    fetcher,
    notify: (level, message) => {
      const text = typeof message === 'string' ? message : String(message ?? '');
      if (level === 'error') toast.error(text || 'Error');
      else if (level === 'success') toast.success(text || 'Success');
      else if (level === 'warning') toast.warning?.(text || 'Warning');
      else toast.info?.(text || 'Info');
    },
    confirm: (message, title) => confirmBridge.confirm(message, title),
    loadDict: async (name: string) => {
      return { name, options: MOCK_DICTS[name] ?? [] };
    },
  };

  return { env, db };
}
