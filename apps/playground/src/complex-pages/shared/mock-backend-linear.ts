/**
 * Linear-style tracker replica mock data + helpers (plan 2026-08-29-1819-2 P4a).
 *
 * Owns the full `/r/Linear__*` fetcher surface (get-only reads; keyboard and
 * write wiring belongs to P4b) so `showcase-env.ts` stays under the 700-line
 * hard gate (antdpro/cal branch-sink precedent). Datasets are deterministic
 * (index arithmetic only): 34 issues ≥3 pages at the default pageSize 10,
 * grouped inbox with read/unread samples, issue detail with sub-issues /
 * relations / activity, project cycle overview, and a three-group command
 * list. Row records carry precomputed `ln-*` class strings so schemas can bind
 * pill/priority/avatar forms via className templates.
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

export interface LinearInboxItem {
  id: string;
  kind: 'assigned' | 'mentioned' | 'comment' | 'status';
  kindLabel: string;
  issueKey: string;
  title: string;
  excerpt: string;
  time: string;
  unread: boolean;
}

export interface LinearInboxGroup {
  key: 'today' | 'week' | 'earlier';
  label: string;
  items: LinearInboxItem[];
}

export interface LinearSubIssue {
  key: string;
  title: string;
  status: LinearIssueStatus;
  statusLabel: string;
  statusDotClass: string;
}

export interface LinearIssueRelation {
  type: 'blocks' | 'blocked' | 'related';
  typeLabel: string;
  targetKey: string;
  targetTitle: string;
}

export interface LinearActivityEntry {
  id: string;
  kind: 'created' | 'status' | 'assign' | 'comment';
  kindLabel: string;
  actor: string;
  initials: string;
  time: string;
  text: string;
}

export interface LinearIssueDetail extends LinearIssueListRow {
  description: string[];
  subIssues: LinearSubIssue[];
  relations: LinearIssueRelation[];
  activity: LinearActivityEntry[];
  placeholder?: boolean;
}

export interface LinearCycle {
  id: string;
  name: string;
  window: string;
  progress: number;
  progressText: string;
  progressClass: string;
  status: 'active' | 'upcoming' | 'completed';
  statusLabel: string;
  statusPillClass: string;
}

export interface LinearProject {
  id: string;
  name: string;
  lead: LinearAssignee;
  summary: string;
  progress: number;
  progressText: string;
  progressClass: string;
  cycleWindow: string;
  status: LinearIssueStatus;
  statusLabel: string;
  statusPillClass: string;
  cycles: LinearCycle[];
}

export interface LinearCommandItem {
  id: string;
  label: string;
  kbd?: string;
}

export interface LinearCommandGroup {
  key: 'navigation' | 'actions' | 'search';
  label: string;
  items: LinearCommandItem[];
}

export interface LinearDatabase {
  issues: LinearIssue[];
  inbox: LinearInboxGroup[];
  projects: LinearProject[];
  commands: LinearCommandGroup[];
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

const LINEAR_INBOX_KIND_LABELS: Record<LinearInboxItem['kind'], string> = {
  assigned: '指派了问题',
  mentioned: '提到了你',
  comment: '评论了问题',
  status: '变更了状态',
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

const LINEAR_ASSIGNEES: LinearAssignee[] = [
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
}

export function filterLinearIssues(rows: LinearIssue[], filter: LinearIssueFilter): LinearIssue[] {
  let result = rows.slice();
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

export function createLinearInbox(): LinearInboxGroup[] {
  const item = (
    n: number,
    kind: LinearInboxItem['kind'],
    issueKey: string,
    title: string,
    excerpt: string,
    time: string,
    unread: boolean,
  ): LinearInboxItem => ({
    id: `ntf-${n}`,
    kind,
    kindLabel: LINEAR_INBOX_KIND_LABELS[kind],
    issueKey,
    title,
    excerpt,
    time,
    unread,
  });

  return [
    {
      key: 'today',
      label: '今天',
      items: [
        item(1, 'assigned', 'ENG-102', '沈亦舟 指派给你一个问题', '列表视图筛选条件在刷新后未保留', '14:20', true),
        item(2, 'comment', 'ENG-105', '周砚秋 评论了工作区切换器问题', '复现路径已补充，请在多团队视图下再次验证。', '11:05', true),
        item(3, 'status', 'ENG-107', '顾北辰 变更了问题状态', '拖拽卡片跨列时偶发占位残留：进行中 → 已完成', '09:32', false),
      ],
    },
    {
      key: 'week',
      label: '本周',
      items: [
        item(4, 'mentioned', 'ENG-115', '苏婉清 在筛选器讨论中提到了你', '@林晚晴 日期快捷项的范围定义需要你确认。', '周二', true),
        item(5, 'assigned', 'ENG-121', '沈亦舟 指派给你一个问题', '收藏分组拖动排序后顺序未持久化', '周一', false),
        item(6, 'comment', 'ENG-118', '周砚秋 评论了命令面板问题', '最近访问分组建议按打开时间倒序截取前五条。', '周一', false),
      ],
    },
    {
      key: 'earlier',
      label: '更早',
      items: [
        item(7, 'status', 'ENG-103', '顾北辰 变更了问题状态', '看板列头计数与实际卡片数不一致：待办 → 已完成', '上周五', false),
        item(8, 'comment', 'ENG-126', '苏婉清 评论了设置页问题', '偏好开关回退问题已在夜间构建中观察不到。', '上周三', false),
        item(9, 'mentioned', 'ENG-130', '周砚秋 在复盘文档中提到了你', '归档恢复入口的层级问题转入下个周期处理。', '上周一', false),
      ],
    },
  ];
}

export function countLinearUnread(groups: LinearInboxGroup[]): number {
  return groups.reduce((sum, g) => sum + g.items.filter((i) => i.unread).length, 0);
}

const LINEAR_RELATION_LABELS: Record<LinearIssueRelation['type'], string> = {
  blocks: '阻塞',
  blocked: '被阻塞',
  related: '关联',
};

export function buildLinearIssueDetail(rows: LinearIssue[], id: string): LinearIssueDetail {
  const issue = rows.find((r) => r.id === id);
  const rowBase = issue ? toLinearIssueRow(issue) : null;
  const seq = issue ? Number(issue.id.slice(4)) : 0;

  if (!rowBase) {
    return {
      id: id || 'ENG-000',
      title: '未找到对应问题',
      status: 'backlog',
      priority: 'none',
      labels: [],
      assignee: LINEAR_ASSIGNEES[0],
      estimate: 0,
      dueDate: '',
      updatedAt: '-',
      project: '',
      cycle: '',
      statusLabel: LINEAR_STATUS_LABELS.backlog,
      priorityLabel: LINEAR_PRIORITY_LABELS.none,
      statusDotClass: `ln-status-dot ln-status-backlog`,
      statusPillClass: `ln-pill ln-pill-backlog`,
      prioClass: `ln-prio ln-prio-none`,
      priorityPillClass: `ln-pill ln-pill-none`,
      assigneeInitials: LINEAR_ASSIGNEES[0].initials,
      description: ['该问题不存在或已被移除，当前展示为兜底记录。'],
      subIssues: [],
      relations: [],
      activity: [],
      placeholder: true,
    };
  }

  const subIssues = rows
    .filter((r) => r.parentKey === issue!.id)
    .map((r) => ({
      key: r.id,
      title: r.title,
      status: r.status,
      statusLabel: LINEAR_STATUS_LABELS[r.status],
      statusDotClass: `ln-status-dot ln-status-${r.status}`,
    }));

  const relations: LinearIssueRelation[] = [
    {
      type: 'blocks',
      typeLabel: LINEAR_RELATION_LABELS.blocks,
      targetKey: `ENG-${101 + ((seq + 9) % 34)}`,
      targetTitle: LINEAR_TITLES[(seq + 9) % 34],
    },
    {
      type: 'related',
      typeLabel: LINEAR_RELATION_LABELS.related,
      targetKey: `ENG-${101 + ((seq + 17) % 34)}`,
      targetTitle: LINEAR_TITLES[(seq + 17) % 34],
    },
  ];

  const actor = LINEAR_ASSIGNEES[seq % LINEAR_ASSIGNEES.length];
  const second = LINEAR_ASSIGNEES[(seq + 2) % LINEAR_ASSIGNEES.length];
  const activity: LinearActivityEntry[] = [
    {
      id: `act-${seq}-1`,
      kind: 'created',
      kindLabel: '创建了问题',
      actor: actor.name,
      initials: actor.initials,
      time: `${issue!.updatedAt.slice(0, 10)} 09:41`,
      text: `登记问题并补充初始描述。`,
    },
    {
      id: `act-${seq}-2`,
      kind: 'status',
      kindLabel: '变更了状态',
      actor: second.name,
      initials: second.initials,
      time: `${issue!.updatedAt.slice(0, 10)} 11:12`,
      text: `状态从 待办 变更为 ${LINEAR_STATUS_LABELS[issue!.status === 'todo' ? 'in_progress' : issue!.status]}。`,
    },
    {
      id: `act-${seq}-3`,
      kind: 'assign',
      kindLabel: '指派了负责人',
      actor: actor.name,
      initials: actor.initials,
      time: `${issue!.updatedAt.slice(0, 10)} 13:05`,
      text: `负责人变更为 ${issue!.assignee.name}。`,
    },
    {
      id: `act-${seq}-4`,
      kind: 'comment',
      kindLabel: '发表了评论',
      actor: second.name,
      initials: second.initials,
      time: issue!.updatedAt,
      text: '已在开发环境复现，初步定位到视图层的状态同步时序，等待修复窗口。',
    },
  ];

  return {
    ...rowBase,
    description: [
      `本问题由例行巡检登记：${issue!.title}。`,
      '复现路径：打开对应视图后按日常操作顺序执行即可稳定复现；已确认与账号权限无关。',
      '验收标准：修复后需覆盖回归用例，并在默认密度与高密度两档下核对视觉表现。',
    ],
    subIssues,
    relations,
    activity,
  };
}

/**
 * Progress bar width classes, enumerated literally so the Tailwind scanner
 * generates the arbitrary-value utilities (schemas cannot compute dynamic
 * widths at runtime).
 */
const LINEAR_PROGRESS_WIDTH_CLASSES: Record<number, string> = {
  0: 'w-0',
  35: 'w-[35%]',
  42: 'w-[42%]',
  62: 'w-[62%]',
  78: 'w-[78%]',
  90: 'w-[90%]',
  100: 'w-full',
};

function linearProgressClass(progress: number): string {
  return LINEAR_PROGRESS_WIDTH_CLASSES[Math.round(progress * 100)] ?? 'w-0';
}

export function createLinearProjects(): LinearProject[] {
  const project = (
    id: string,
    name: string,
    lead: LinearAssignee,
    summary: string,
    progress: number,
    window: string,
    status: LinearIssueStatus,
    cycles: LinearCycle[],
  ): LinearProject => ({
    id,
    name,
    lead,
    summary,
    progress,
    progressText: `${Math.round(progress * 100)}%`,
    progressClass: linearProgressClass(progress),
    cycleWindow: window,
    status,
    statusLabel: LINEAR_STATUS_LABELS[status],
    statusPillClass: `ln-pill ln-pill-${status}`,
    cycles,
  });

  const cycle = (
    id: string,
    name: string,
    window: string,
    progress: number,
    status: LinearCycle['status'],
  ): LinearCycle => ({
    id,
    name,
    window,
    progress,
    progressText: `${Math.round(progress * 100)}%`,
    progressClass: linearProgressClass(progress),
    status,
    statusLabel: status === 'active' ? '活跃' : status === 'upcoming' ? '即将开始' : '已完成',
    statusPillClass:
      status === 'active'
        ? 'ln-pill ln-pill-in_progress'
        : status === 'upcoming'
          ? 'ln-pill ln-pill-todo'
          : 'ln-pill ln-pill-done',
  });

  return [
    project('prj-1', '平台重构', LINEAR_ASSIGNEES[1], '核心视图层与数据层的分层重构，统一状态同步协议。', 0.62, '8月4日 – 9月30日', 'in_progress', [
      cycle('cyc-23', '周期 23', '8月4日 – 8月17日', 1, 'completed'),
      cycle('cyc-24', '周期 24', '8月18日 – 8月31日', 0.78, 'active'),
      cycle('cyc-25', '周期 25', '9月1日 – 9月14日', 0, 'upcoming'),
    ]),
    project('prj-2', '移动端体验', LINEAR_ASSIGNEES[3], '窄屏断点、触控目标与离线缓存的体验专项。', 0.35, '8月11日 – 10月10日', 'in_progress', [
      cycle('cyc-m1', '周期 24', '8月18日 – 8月31日', 0.42, 'active'),
      cycle('cyc-m2', '周期 25', '9月1日 – 9月14日', 0, 'upcoming'),
    ]),
    project('prj-3', '性能专项', LINEAR_ASSIGNEES[2], '首屏渲染与长列表滚动的性能治理，目标 60fps。', 0.9, '7月14日 – 8月29日', 'done', [
      cycle('cyc-p1', '周期 22', '7月14日 – 7月27日', 1, 'completed'),
      cycle('cyc-p2', '周期 23', '8月4日 – 8月17日', 1, 'completed'),
    ]),
  ];
}

export function createLinearCommands(): LinearCommandGroup[] {
  return [
    {
      key: 'navigation',
      label: '跳转',
      items: [
        { id: 'cmd-nav-inbox', label: '打开收件箱', kbd: 'G I' },
        { id: 'cmd-nav-my', label: '我的问题', kbd: 'G M' },
        { id: 'cmd-nav-active', label: '活跃问题', kbd: 'G A' },
        { id: 'cmd-nav-board', label: '看板视图', kbd: 'G D' },
        { id: 'cmd-nav-cycles', label: '周期概览', kbd: 'G C' },
        { id: 'cmd-nav-projects', label: '项目列表', kbd: 'G P' },
        { id: 'cmd-nav-settings', label: '打开设置', kbd: 'G S' },
      ],
    },
    {
      key: 'actions',
      label: '动作',
      items: [
        { id: 'cmd-act-new', label: '新建问题', kbd: 'C' },
        { id: 'cmd-act-filter', label: '筛选当前视图', kbd: 'F' },
        { id: 'cmd-act-copy', label: '复制问题链接', kbd: '⇧⌘,' },
        { id: 'cmd-act-archive', label: '归档所选问题', kbd: '#' },
        { id: 'cmd-act-help', label: '快捷键帮助', kbd: '?' },
      ],
    },
    {
      key: 'search',
      label: '搜索',
      items: [
        { id: 'cmd-search-issues', label: '搜索问题', kbd: '/' },
        { id: 'cmd-search-projects', label: '搜索项目' },
        { id: 'cmd-search-people', label: '搜索成员' },
      ],
    },
  ];
}

export function createLinearDatabase(): LinearDatabase {
  return {
    issues: createLinearIssues(),
    inbox: createLinearInbox(),
    projects: createLinearProjects(),
    commands: createLinearCommands(),
  };
}

export interface LinearFetcherBranchInput {
  url: string;
  method: string;
  params: Record<string, unknown>;
  body: Record<string, unknown>;
}

/**
 * Full `/r/Linear__*` fetcher branch (plan 2026-08-29-1819-2 P4a; get-only —
 * writes/keyboard wiring belong to P4b). Kept here so `showcase-env.ts` stays
 * under the 700-line hard gate. Returns null when the request is not a Linear
 * endpoint or the method is not `get`.
 */
export function createLinearFetcherBranch(db: LinearDatabase, clone: <T>(value: T) => T) {
  return function handleLinearBranch<T>(input: LinearFetcherBranchInput): { status: number; data: T } | null {
    const { url, method, params, body } = input;
    if (!url.includes('/r/Linear__')) {
      return null;
    }
    if (method.toLowerCase() !== 'get') {
      return null;
    }
    const qs = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams();
    const read = (key: string): string | undefined => {
      const value = params[key] ?? body[key] ?? qs.get(key);
      return value === undefined || value === null ? undefined : String(value);
    };

    if (url.includes('/r/Linear__issues')) {
      if (read('view') === 'board') {
        const payload = buildLinearBoardData(filterLinearIssues(db.issues, {
          keyword: read('keyword'),
          label: read('label'),
          assignee: read('assignee'),
        }));
        return { status: 0, data: clone(payload) as T };
      }
      const rows = filterLinearIssues(db.issues, {
        keyword: read('keyword'),
        status: read('status'),
        priority: read('priority'),
        label: read('label'),
        assignee: read('assignee'),
      }).map(toLinearIssueRow);
      const paged = paginateLinear(rows, Number(read('page') ?? 1) || 1, Number(read('perPage') ?? 10) || 10);
      return { status: 0, data: clone(paged) as T };
    }
    if (url.includes('/r/Linear__inbox')) {
      const groups = db.inbox.map((g) => ({
        ...g,
        items: g.items.filter((i) => !read('unreadOnly') || i.unread),
      }));
      return { status: 0, data: clone({ groups, unreadCount: countLinearUnread(groups), total: groups.reduce((s, g) => s + g.items.length, 0) }) as T };
    }
    if (url.includes('/r/Linear__issue')) {
      const detail = buildLinearIssueDetail(db.issues, read('id') ?? '');
      return { status: 0, data: clone(detail) as T };
    }
    if (url.includes('/r/Linear__projects')) {
      return { status: 0, data: clone({ items: db.projects, total: db.projects.length }) as T };
    }
    if (url.includes('/r/Linear__commands')) {
      return { status: 0, data: clone({ groups: db.commands, total: db.commands.reduce((s, g) => s + g.items.length, 0) }) as T };
    }
    return null;
  };
}
