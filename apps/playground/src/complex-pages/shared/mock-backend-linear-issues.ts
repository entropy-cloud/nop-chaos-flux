/**
 * Linear-style tracker replica — issue dataset, board builder, and write
 * operations (plan 2026-08-30-0040-1 P4b Phase 1 module split).
 *
 * Extracted from `mock-backend-linear.ts` following the antdpro entity-module
 * precedent: pure dataset helpers + deterministic (index arithmetic only)
 * records here, session state stays in the caller-owned `LinearIssue[]` array
 * so writes are observable across pages within one session. Write contracts
 * (all post unless noted): `Linear__bulkUpdate` (patch by ids, zero match →
 * miss), `Linear__createIssue` (append `ENG-` sequence, title required),
 * `Linear__archiveIssue` (soft-archive flag, excluded from default list and
 * board reads), `Linear__moveCard` (status flip + session ordering,
 * `col-`/`card-` prefixes tolerated), `Linear__copyLink` (get, no-op
 * semantic-simulation carrier). Detail assembly lives in
 * `mock-backend-linear-detail.ts`; inbox/projects/commands + fetcher branch
 * stay in `mock-backend-linear.ts`.
 *
 * All copy is original self-authored Chinese; no "Linear" name, trademark, or
 * brand asset appears in the datasets.
 */

export type LinearIssueStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled';
export type LinearPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export interface LinearAssignee {
  name: string;
  initials: string;
}

export interface LinearIssue {
  id: string;
  title: string;
  status: LinearIssueStatus;
  priority: LinearPriority;
  labels: string[];
  assignee: LinearAssignee;
  estimate: number;
  dueDate: string;
  updatedAt: string;
  project: string;
  cycle: string;
  parentKey?: string;
  /** soft-archive flag (P4b `Linear__archiveIssue`); excluded from default reads */
  archived?: boolean;
}

export interface LinearIssueListRow extends LinearIssue {
  statusLabel: string;
  priorityLabel: string;
  statusDotClass: string;
  statusPillClass: string;
  prioClass: string;
  priorityPillClass: string;
  assigneeInitials: string;
}

export const LINEAR_STATUS_LABELS: Record<LinearIssueStatus, string> = {
  backlog: '待定',
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  cancelled: '已取消',
};

export const LINEAR_PRIORITY_LABELS: Record<LinearPriority, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
  none: '无优先级',
};

/** Column order + titles + tint for the status board (generic status words). */
export const LINEAR_BOARD_COLUMNS: Array<{ id: LinearIssueStatus; title: string; color: string }> = [
  { id: 'backlog', title: '待定', color: '#62666d' },
  { id: 'todo', title: '待办', color: '#8a8f98' },
  { id: 'in_progress', title: '进行中', color: '#f59e0b' },
  { id: 'done', title: '已完成', color: '#10b981' },
  { id: 'cancelled', title: '已取消', color: '#62666d' },
];

/**
 * Priority → accent color (equivalently drafted from the semantic palette;
 * plan §差异声明). Used by the board card color dot so the priority is visible
 * on the default card face.
 */
export const LINEAR_PRIORITY_COLORS: Record<LinearPriority, string> = {
  urgent: '#e53935',
  high: '#f59e0b',
  medium: '#5e6ad2',
  low: '#8a8f98',
  none: '#62666d',
};

const LINEAR_LABEL_TAG_COLORS = ['#8a8f98', '#5e6ad2', '#10b981', '#f59e0b', '#e53935', '#a8b1ff'];

const LINEAR_TITLES = [
  '工作区切换器在多团队视图下出现重复条目',
  '列表视图筛选条件在刷新后未保留',
  '看板列头计数与实际卡片数不一致',
  '高密度模式下行高在不同缩放档位抖动',
  '命令面板搜索结果缺少最近访问分组',
  '通知中心批量已读后角标未即时更新',
  '拖拽卡片跨列时偶发占位残留',
  '问题详情页属性侧栏标签溢出未换行',
  '子问题完成度汇总未计入父问题进度',
  '键盘高亮移动到视口边缘时未自动滚动',
  '优先级条在低对比度主题下难以辨认',
  '批量修改标签时部分行未按字母序合并',
  '项目周期进度条在小数进度下四舍五入错误',
  '收藏分组拖动排序后顺序未持久化',
  '筛选器日期范围快捷项缺少“本月”',
  '问题标识符在复制后缺少工作区前缀',
  '活动流时间戳未按相对时间展示',
  '空状态插画与文案层级不统一',
  '指派头像在窄屏下被裁切',
  '估算点数输入允许负数',
  '列表排序切换时滚动位置跳回顶部',
  '显示选项抽屉的分组下拉缺少“无分组”',
  '周期概览的时间窗跨年显示异常',
  '搜索结果高亮关键词大小写不敏感',
  '已取消问题在默认视图中仍参与计数',
  '评论 @ 提及未触发通知',
  '看板过滤标签与卡片标签交集判断错误',
  '批量操作栏遮挡最后一行数据',
  '详情页描述区在长链接下横向溢出',
  '设置页偏好开关状态刷新后回退',
  '快捷键帮助入口在帮助面板打开时应隐藏',
  '多人协作时光标提示未展示操作者姓名',
  '问题标题编辑失去焦点后未保存草稿',
  '归档问题的恢复入口层级过深',
];

const LINEAR_STATUSES: LinearIssueStatus[] = [
  'todo', 'in_progress', 'done', 'backlog', 'todo', 'done', 'in_progress', 'backlog',
  'cancelled', 'done', 'todo', 'in_progress', 'backlog', 'done', 'todo', 'in_progress',
  'done', 'backlog', 'todo', 'cancelled', 'done', 'in_progress', 'backlog', 'todo',
  'done', 'in_progress', 'todo', 'backlog', 'done', 'cancelled', 'in_progress', 'todo',
  'done', 'backlog',
];

const LINEAR_PRIORITIES: LinearPriority[] = [
  'high', 'medium', 'urgent', 'none', 'low', 'medium', 'high', 'none',
  'low', 'urgent', 'medium', 'none', 'high', 'low', 'none', 'medium',
  'urgent', 'low', 'medium', 'none', 'high', 'medium', 'low', 'none',
  'medium', 'urgent', 'low', 'high', 'none', 'low', 'medium', 'high',
  'none', 'medium',
];

export const LINEAR_ASSIGNEES: LinearAssignee[] = [
  { name: '林晚晴', initials: '林' },
  { name: '沈亦舟', initials: '沈' },
  { name: '顾北辰', initials: '顾' },
  { name: '苏婉清', initials: '苏' },
  { name: '周砚秋', initials: '周' },
];

const LINEAR_LABELS = ['前端', '后端', '设计', '性能', '缺陷', '文档'];

const LINEAR_PROJECT_NAMES = ['平台重构', '移动端体验', ''];
const LINEAR_CYCLE_NAMES = ['周期 24', '周期 25', '', '周期 24'];
const LINEAR_ESTIMATES = [0, 1, 2, 3, 5, 8];

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

export function linearWriteStamp(): string {
  return '2026-08-30 12:00';
}

export function createLinearIssues(): LinearIssue[] {
  const rows: LinearIssue[] = [];
  for (let i = 0; i < 34; i += 1) {
    rows.push({
      id: `ENG-${101 + i}`,
      title: LINEAR_TITLES[i],
      status: LINEAR_STATUSES[i],
      priority: LINEAR_PRIORITIES[i],
      labels:
        i % 4 === 0
          ? []
          : [LINEAR_LABELS[i % LINEAR_LABELS.length], ...(i % 3 === 0 ? [LINEAR_LABELS[(i + 2) % LINEAR_LABELS.length]] : [])],
      assignee: LINEAR_ASSIGNEES[i % LINEAR_ASSIGNEES.length],
      estimate: LINEAR_ESTIMATES[i % LINEAR_ESTIMATES.length],
      dueDate: i % 3 === 0 ? '' : `2026-09-${pad(1 + (i % 28), 2)}`,
      updatedAt: `2026-08-${pad(2 + ((i * 3) % 27), 2)} ${pad(9 + (i % 9), 2)}:${pad((i * 17) % 60, 2)}`,
      project: LINEAR_PROJECT_NAMES[i % LINEAR_PROJECT_NAMES.length],
      cycle: LINEAR_CYCLE_NAMES[i % LINEAR_CYCLE_NAMES.length],
      parentKey: i % 11 === 7 ? 'ENG-105' : undefined,
    });
  }
  return rows;
}

export function toLinearIssueRow(issue: LinearIssue): LinearIssueListRow {
  return {
    ...issue,
    statusLabel: LINEAR_STATUS_LABELS[issue.status],
    priorityLabel: LINEAR_PRIORITY_LABELS[issue.priority],
    statusDotClass: `ln-status-dot ln-status-${issue.status}`,
    statusPillClass: `ln-pill ln-pill-${issue.status}`,
    prioClass: `ln-prio ln-prio-${issue.priority}`,
    priorityPillClass: `ln-pill ln-pill-${issue.priority}`,
    assigneeInitials: issue.assignee.initials,
  };
}

export interface LinearIssueFilter {
  keyword?: string;
  status?: string;
  priority?: string;
  label?: string;
  assignee?: string;
  includeArchived?: boolean;
}

export function filterLinearIssues(rows: LinearIssue[], filter: LinearIssueFilter): LinearIssue[] {
  let result = filter.includeArchived ? rows.slice() : rows.filter((r) => !r.archived);
  const keyword = typeof filter.keyword === 'string' ? filter.keyword.trim().toLowerCase() : '';
  if (keyword) {
    result = result.filter(
      (r) => r.id.toLowerCase().includes(keyword) || r.title.toLowerCase().includes(keyword),
    );
  }
  if (filter.status) result = result.filter((r) => r.status === filter.status);
  if (filter.priority) result = result.filter((r) => r.priority === filter.priority);
  if (filter.label) result = result.filter((r) => r.labels.includes(filter.label!));
  if (filter.assignee) result = result.filter((r) => r.assignee.name === filter.assignee);
  return result;
}

export function paginateLinear<T>(
  rows: T[],
  page: number,
  pageSize: number,
): { items: T[]; total: number; page: number; pageSize: number; pages: number } {
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

export interface LinearBoardPayload {
  board: Record<string, unknown>;
  columns: Array<{ id: string; title: string; count: number }>;
}

/**
 * Build the kanban BoardData structure (root + status columns + cards) from
 * the issue dataset. Card payloads map onto the kanban default card face
 * (title / description / color dot / tag pills / member initials) because the
 * cardTemplate region renders without card scope — the identifier and
 * estimate ride the description line, labels become tag pills, the assignee
 * becomes a member circle, and the priority becomes the accent dot color.
 */
export function buildLinearBoardData(rows: LinearIssue[]): LinearBoardPayload {
  const board: Record<string, unknown> = {};
  const columns: LinearBoardPayload['columns'] = [];
  const rootChildren: string[] = [];

  for (const col of LINEAR_BOARD_COLUMNS) {
    const colId = `col-${col.id}`;
    const cards = rows.filter((r) => r.status === col.id);
    const cardIds: string[] = [];
    for (const issue of cards) {
      const cardId = `card-${issue.id}`;
      board[cardId] = {
        id: cardId,
        type: 'card',
        parentId: colId,
        children: [],
        data: {
          title: issue.title,
          description: `${issue.id} · 估算 ${issue.estimate}`,
        },
        meta: {
          color: LINEAR_PRIORITY_COLORS[issue.priority],
          tags: issue.labels.map((label, li) => ({
            id: `${issue.id}-label-${li}`,
            text: label,
            color: LINEAR_LABEL_TAG_COLORS[(issue.labels.indexOf(label) + li) % LINEAR_LABEL_TAG_COLORS.length],
          })),
          members: [{ id: `${issue.id}-assignee`, name: issue.assignee.name }],
        },
      };
      cardIds.push(cardId);
    }
    board[colId] = {
      id: colId,
      type: 'column',
      parentId: 'root',
      children: cardIds,
      data: { title: col.title },
      meta: { color: col.color },
    };
    rootChildren.push(colId);
    columns.push({ id: colId, title: col.title, count: cardIds.length });
  }

  board['root'] = { id: 'root', type: 'root', children: rootChildren, data: {}, meta: {} };
  return { board, columns };
}

/* ── Write operations (P4b Phase 1; session state = the caller's array) ─── */

export interface LinearWriteResult {
  ok: boolean;
  error?: string;
  updated?: number;
  id?: string;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

interface LinearIssuePatch {
  status?: LinearIssueStatus;
  priority?: LinearPriority;
  assignee?: LinearAssignee;
  labels?: string[];
}

function pickLinearIssuePatch(source: Record<string, unknown>): LinearIssuePatch | null {
  const patch: LinearIssuePatch = {};
  const status = source.status;
  if (status !== undefined && status !== null && status !== '') {
    if (typeof status !== 'string' || !(status in LINEAR_STATUS_LABELS)) return null;
    patch.status = status as LinearIssueStatus;
  }
  const priority = source.priority;
  if (priority !== undefined && priority !== null && priority !== '') {
    if (typeof priority !== 'string' || !(priority in LINEAR_PRIORITY_LABELS)) return null;
    patch.priority = priority as LinearPriority;
  }
  const assignee = source.assignee;
  if (assignee !== undefined && assignee !== null && assignee !== '') {
    if (typeof assignee !== 'string') return null;
    const found = LINEAR_ASSIGNEES.find((a) => a.name === assignee);
    if (!found) return null;
    patch.assignee = { ...found };
  }
  const labels = source.labels;
  if (labels !== undefined && labels !== null) {
    if (!Array.isArray(labels) || labels.some((l) => typeof l !== 'string')) return null;
    patch.labels = labels as string[];
  }
  return patch;
}

export function applyLinearIssuePatch(row: LinearIssue, patch: LinearIssuePatch): void {
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.assignee !== undefined) row.assignee = patch.assignee;
  if (patch.labels !== undefined) row.labels = patch.labels;
  row.updatedAt = linearWriteStamp();
}

/**
 * `Linear__bulkUpdate` core: patch ids in place. Canonical body is
 * `{ids, patch:{status?|priority?|assignee?|labels?}}`; flat top-level patch
 * keys are accepted as the dialog-form alias. Partial match applies to the
 * matched subset (ln-bulk-miss); zero match → `{ok:false}`.
 */
export function bulkUpdateLinearIssues(rows: LinearIssue[], input: Record<string, unknown>): LinearWriteResult {
  const ids = toStringArray(input.ids);
  if (ids.length === 0) return { ok: false, error: 'no ids' };
  const patchSource = (input.patch && typeof input.patch === 'object' && !Array.isArray(input.patch)
    ? input.patch
    : input) as Record<string, unknown>;
  const patch = pickLinearIssuePatch(patchSource);
  if (!patch || Object.keys(patch).length === 0) return { ok: false, error: 'invalid patch' };
  const idSet = new Set(ids);
  const matched = rows.filter((r) => idSet.has(r.id) && !r.archived);
  if (matched.length === 0) return { ok: false, error: 'no matching issues' };
  for (const row of matched) applyLinearIssuePatch(row, patch);
  return { ok: true, updated: matched.length };
}

export function nextLinearIssueId(rows: LinearIssue[]): string {
  const max = rows.reduce((acc, r) => Math.max(acc, Number(r.id.slice(4)) || 0), 100);
  return `ENG-${max + 1}`;
}

/**
 * `Linear__createIssue` core: append the next `ENG-` sequence record.
 * Title required (ln-create-miss guard); unspecified fields take defaults.
 */
export function createLinearIssueRecord(rows: LinearIssue[], input: Record<string, unknown>): LinearWriteResult {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) return { ok: false, error: 'title required' };
  const patch = pickLinearIssuePatch(input);
  if (patch === null) return { ok: false, error: 'invalid field' };
  const issue: LinearIssue = {
    id: nextLinearIssueId(rows),
    title,
    status: patch.status ?? 'todo',
    priority: patch.priority ?? 'none',
    labels: patch.labels ?? [],
    assignee: patch.assignee ?? LINEAR_ASSIGNEES[0],
    estimate: 0,
    dueDate: '',
    updatedAt: linearWriteStamp(),
    project: '',
    cycle: '',
  };
  rows.push(issue);
  return { ok: true, id: issue.id, updated: 1 };
}

/** `Linear__archiveIssue` core: soft-archive by ids; zero match → `{ok:false}`. */
export function archiveLinearIssues(rows: LinearIssue[], input: Record<string, unknown>): LinearWriteResult {
  const ids = toStringArray(input.ids);
  if (ids.length === 0) return { ok: false, error: 'no ids' };
  const idSet = new Set(ids);
  const matched = rows.filter((r) => idSet.has(r.id) && !r.archived);
  if (matched.length === 0) return { ok: false, error: 'no matching issues' };
  for (const row of matched) {
    row.archived = true;
    row.updatedAt = linearWriteStamp();
  }
  return { ok: true, updated: matched.length };
}

/**
 * `Linear__moveCard` core: status flip + session ordering. `card-`/`col-`
 * prefixes are tolerated; ordering inserts the card before the `toIndex`-th
 * card of the target column (append when out of range). Unknown column or
 * unmatched id → `{ok:false}` (ln-move-miss).
 */
export function moveLinearCard(rows: LinearIssue[], input: Record<string, unknown>): LinearWriteResult {
  const rawId = typeof input.id === 'string' ? input.id : '';
  const id = rawId.replace(/^card-/, '');
  const rawColumn = typeof input.toColumn === 'string' ? input.toColumn.replace(/^col-/, '') : '';
  const column = LINEAR_BOARD_COLUMNS.find((c) => c.id === rawColumn);
  if (!column) return { ok: false, error: 'unknown column' };
  const issue = rows.find((r) => r.id === id && !r.archived);
  if (!issue) return { ok: false, error: 'no matching card' };
  if (input.forceMiss === true) return { ok: false, error: 'forced move miss' };

  issue.status = column.id;
  issue.updatedAt = linearWriteStamp();

  const toIndex = Number(input.toIndex);
  if (input.toIndex !== undefined && input.toIndex !== '' && Number.isFinite(toIndex)) {
    const at = rows.indexOf(issue);
    if (at >= 0) rows.splice(at, 1);
    const columnCards = rows.filter((r) => r.status === column.id);
    const anchor = columnCards[toIndex];
    if (anchor) {
      rows.splice(rows.indexOf(anchor), 0, issue);
    } else {
      const last = columnCards[columnCards.length - 1];
      if (last) rows.splice(rows.indexOf(last) + 1, 0, issue);
      else rows.push(issue);
    }
  }
  return { ok: true, id: issue.id, updated: 1 };
}
