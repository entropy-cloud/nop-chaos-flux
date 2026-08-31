/**
 * Linear-style tracker replica mock data + fetcher branch (plans
 * 2026-08-29-1819-2 P4a reads + 2026-08-30-0040-1 P4b writes).
 *
 * This module owns the full `/r/Linear__*` fetcher surface so
 * `showcase-env.ts` stays under the 700-line hard gate (antdpro/cal
 * branch-sink precedent). Issue/board dataset + write-operation cores live in
 * `mock-backend-linear-issues.ts`; detail assembly lives in
 * `mock-backend-linear-detail.ts` (P4b Phase 1 module split). Session state
 * lives in the factory closure (issues array + inbox groups) so writes are
 * observable across pages within one session.
 *
 * Read endpoints (get): `Linear__issues` (`perPage`/`view=board`/filter
 * params), `Linear__inbox`, `Linear__issue?id=`, `Linear__projects`,
 * `Linear__commands`, plus the no-op `Linear__copyLink` semantic carrier.
 * Write endpoints (post): `Linear__bulkUpdate`, `Linear__createIssue`,
 * `Linear__archiveIssue`, `Linear__moveCard`, `Linear__inboxUpdate`.
 *
 * Opt-in e2e hooks (mirror mock-backend-cal): specs pre-create
 * `window.__linearEndpointCalls` / `window.__linearTestHooks` via
 * addInitScript; production never sets them, so both stay no-ops.
 *
 * All copy is original self-authored Chinese; no "Linear" name, trademark, or
 * brand asset appears in the datasets.
 */

import {
  LINEAR_ASSIGNEES,
  LINEAR_STATUS_LABELS,
  buildLinearBoardData,
  bulkUpdateLinearIssues,
  archiveLinearIssues,
  createLinearIssueRecord,
  createLinearIssues,
  filterLinearIssues,
  moveLinearCard,
  paginateLinear,
  toLinearIssueRow,
  type LinearIssue,
  type LinearIssueListRow,
} from './mock-backend-linear-issues';
import { buildLinearIssueDetail } from './mock-backend-linear-detail';

export * from './mock-backend-linear-issues';
export * from './mock-backend-linear-detail';

export interface LinearInboxItem {
  id: string;
  kind: 'assigned' | 'mentioned' | 'comment' | 'status';
  kindLabel: string;
  issueKey: string;
  title: string;
  excerpt: string;
  time: string;
  unread: boolean;
  /** soft-archive flag (P4b `Linear__inboxUpdate`); excluded from default reads */
  archived?: boolean;
}

export interface LinearInboxGroup {
  key: 'today' | 'week' | 'earlier';
  label: string;
  items: LinearInboxItem[];
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
  lead: LinearIssueListRow['assignee'];
  summary: string;
  progress: number;
  progressText: string;
  progressClass: string;
  cycleWindow: string;
  status: LinearIssueListRow['status'];
  statusLabel: string;
  statusPillClass: string;
  cycles: LinearCycle[];
}

export interface LinearCommandItem {
  id: string;
  label: string;
  kbd?: string;
  /** execution wiring (P4b L1): target page for navigation commands */
  href?: string;
  /** execution wiring (P4b L1): simulated action key for action commands */
  act?: 'create' | 'filter' | 'copy' | 'archive' | 'help';
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

const LINEAR_INBOX_KIND_LABELS: Record<LinearInboxItem['kind'], string> = {
  assigned: '指派了问题',
  mentioned: '提到了你',
  comment: '评论了问题',
  status: '变更了状态',
};

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

/**
 * `Linear__inboxUpdate` core: `op: 'read'` flips unread off, `op: 'archive'`
 * also soft-archives (hidden from default reads). Empty `ids` targets all
 * notifications (bulk-bar carrier). Zero match → `{ok:false}`
 * (ln-inbox-miss).
 */
export function updateLinearInbox(
  groups: LinearInboxGroup[],
  input: Record<string, unknown>,
): { ok: boolean; error?: string; updated?: number } {
  const op = input.op === 'read' || input.op === 'archive' ? input.op : null;
  if (!op) return { ok: false, error: 'unknown op' };
  const ids = Array.isArray(input.ids)
    ? input.ids.filter((v): v is string => typeof v === 'string' && v.length > 0)
    : [];
  const idSet = new Set(ids);
  const all = groups.flatMap((g) => g.items);
  const targets = ids.length === 0 ? all.filter((i) => !i.archived) : all.filter((i) => idSet.has(i.id) && !i.archived);
  if (targets.length === 0) return { ok: false, error: 'no matching notifications' };
  for (const item of targets) {
    item.unread = false;
    if (op === 'archive') item.archived = true;
  }
  return { ok: true, updated: targets.length };
}

export function createLinearProjects(): LinearProject[] {
  const project = (
    id: string,
    name: string,
    lead: LinearIssueListRow['assignee'],
    summary: string,
    progress: number,
    window: string,
    status: LinearIssueListRow['status'],
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
        { id: 'cmd-nav-inbox', label: '打开收件箱', kbd: 'G I', href: '#/complex-pages/linear-inbox' },
        { id: 'cmd-nav-my', label: '我的问题', kbd: 'G M', href: '#/complex-pages/linear-issues' },
        { id: 'cmd-nav-active', label: '活跃问题', kbd: 'G A', href: '#/complex-pages/linear-issues' },
        { id: 'cmd-nav-board', label: '看板视图', kbd: 'G D', href: '#/complex-pages/linear-board' },
        { id: 'cmd-nav-cycles', label: '周期概览', kbd: 'G C', href: '#/complex-pages/linear-projects' },
        { id: 'cmd-nav-projects', label: '项目列表', kbd: 'G P', href: '#/complex-pages/linear-projects' },
        { id: 'cmd-nav-settings', label: '打开设置', kbd: 'G S', href: '#/complex-pages/linear-settings' },
      ],
    },
    {
      key: 'actions',
      label: '动作',
      items: [
        { id: 'cmd-act-new', label: '新建问题', kbd: 'C', act: 'create' },
        { id: 'cmd-act-filter', label: '筛选当前视图', kbd: 'F', act: 'filter' },
        { id: 'cmd-act-copy', label: '复制问题链接', kbd: '⇧⌘,', act: 'copy' },
        { id: 'cmd-act-archive', label: '归档所选问题', kbd: '#', act: 'archive' },
        { id: 'cmd-act-help', label: '快捷键帮助', kbd: '?', act: 'help' },
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

type LinearTestHooks = {
  moveMiss?: boolean;
  /** last `Linear__moveCard` body (opt-in e2e observation; production no-op) */
  lastMove?: Record<string, unknown>;
};

function readLinearTestHooks(): LinearTestHooks | undefined {
  return (globalThis as { __linearTestHooks?: LinearTestHooks }).__linearTestHooks;
}

function countLinearEndpointCall(url: string): void {
  const counters = (globalThis as { __linearEndpointCalls?: Record<string, number> }).__linearEndpointCalls;
  if (!counters) return;
  const name = url.slice(url.indexOf('Linear__')).split('?')[0];
  counters[name] = (counters[name] ?? 0) + 1;
}

/**
 * Full `/r/Linear__*` fetcher branch. Read payloads clone out of the session
 * state; write endpoints mutate the session arrays in place. Returns null
 * when the request is not a Linear endpoint.
 */
export function createLinearFetcherBranch(db: LinearDatabase, clone: <T>(value: T) => T) {
  function handleLinearBranch<T>(input: LinearFetcherBranchInput): { status: number; data: T } | null {
    const { url, method, params, body } = input;
    if (!url.includes('/r/Linear__')) {
      return null;
    }
    countLinearEndpointCall(url);
    const normalizedMethod = method.toLowerCase();
    const qs = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams();
    const read = (key: string): string | undefined => {
      const value = params[key] ?? body[key] ?? qs.get(key);
      return value === undefined || value === null ? undefined : String(value);
    };

    // ----- writes (P4b) -----
    if (normalizedMethod === 'post') {
      if (url.includes('/r/Linear__bulkUpdate')) {
        const result = bulkUpdateLinearIssues(db.issues, body);
        return result.ok
          ? { status: 0, data: clone({ ok: true, updated: result.updated }) as T }
          : { status: 1, data: clone({ ok: false, error: result.error }) as T };
      }
      if (url.includes('/r/Linear__createIssue')) {
        const result = createLinearIssueRecord(db.issues, body);
        return result.ok
          ? { status: 0, data: clone({ ok: true, id: result.id }) as T }
          : { status: 1, data: clone({ ok: false, error: result.error }) as T };
      }
      if (url.includes('/r/Linear__archiveIssue')) {
        const result = archiveLinearIssues(db.issues, body);
        return result.ok
          ? { status: 0, data: clone({ ok: true, archived: result.updated }) as T }
          : { status: 1, data: clone({ ok: false, error: result.error }) as T };
      }
      if (url.includes('/r/Linear__moveCard')) {
        const hooks = readLinearTestHooks();
        if (hooks) hooks.lastMove = { ...body };
        const result = moveLinearCard(db.issues, { ...body, forceMiss: hooks?.moveMiss === true });
        return result.ok
          ? { status: 0, data: clone({ ok: true, id: result.id }) as T }
          : { status: 1, data: clone({ ok: false, error: result.error }) as T };
      }
      if (url.includes('/r/Linear__inboxUpdate')) {
        const result = updateLinearInbox(db.inbox, body);
        return result.ok
          ? { status: 0, data: clone({ ok: true, updated: result.updated }) as T }
          : { status: 1, data: clone({ ok: false, error: result.error }) as T };
      }
      return { status: 1, data: clone({ ok: false, error: 'unknown Linear write endpoint' }) as T };
    }
    if (normalizedMethod !== 'get') {
      return null;
    }

    // ----- reads (P4a) + copy-link no-op carrier (P4b) -----
    if (url.includes('/r/Linear__copyLink')) {
      const id = read('id') ?? '';
      return { status: 0, data: clone({ ok: true, id, url: `https://tracker.demo/issue/${id}` }) as T };
    }
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
        items: g.items.filter((i) => !i.archived && (!read('unreadOnly') || i.unread)),
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
  }

  // Opt-in e2e hook: force the ln-move-miss branch through the exact endpoint
  // path — the drag UI cannot produce an unknown card/column (P4b Phase 3).
  const hooks = (globalThis as { __linearTestHooks?: LinearTestHooks }).__linearTestHooks;
  if (hooks) {
    hooks.moveMiss = false;
  }

  return handleLinearBranch;
}
