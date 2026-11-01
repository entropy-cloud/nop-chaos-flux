/**
 * Business-replication AI mock backend — K2 ticket-console endpoint subset
 * (plan 807; D3 §4.3 ai table K2 five rows, named verbatim). Delegate module
 * under the plan-807 450-line module gate, same pattern as the CRM C2/C3
 * delegates: the `/r/ReplAi__` fetcher branch stays in the main module (single
 * endpoint-counter call site per request) and hands unmatched K2 urls to
 * `handleReplAiK2Branch`.
 *
 * Endpoints:
 * - get  `ticketFindPage`  — {items, total, board, stats}: 28-ticket queue over
 *   the six ErpCsTicket statuses + the flat kanban BoardData projection (W2/C1
 *   board-builder precedent folded into the five-endpoint contract — D3 §4.3
 *   has no separate board endpoint) + the stat-tile KPI aggregate.
 *   `slaRemainingMinutes` is computed AT READ TIME from the seeded deadline
 *   (G9 one-shot static text source; deadlines seed relative to Date.now() at
 *   session creation so the text stays within the §5.2 <60s tolerance).
 * - get  `ticketActionFind?ticketId=` — trajectory {items, total} projected
 *   onto the live TimelineItemSchema shape (value/time/title/detail/level;
 *   raw operator/actionType kept on the item for the §5.2 assertion), ASC.
 * - post `ticketMutation`  — assign/start/resolve/close/reopen/escalate route;
 *   illegal fromStatus → status:1 `ILLEGAL_TRANSITION` (D3 §4.3 error branch).
 *   Success mutates the session row + appends a trajectory action (escalate
 *   keeps the status and bumps escalationLevel).
 * - post `ticketReply`     — reply submit (G12 write-back path); appends a
 *   `reply` trajectory action.
 * - get  `suggestionFind?ticketId=` — AI suggested replies {items, total}
 *   carrying `confidence` (the G11 gate reads items[0].confidence < 0.6);
 *   unknown ticketId → empty face (not an error envelope).
 *
 * Import-clean of the main module (deps-baseline no-cycle): the session subset
 * travels in through the structural `ReplAiK2BranchInput.session` and the hook
 * mirrors write through the structural `hooks` subset.
 */

export type ReplAiTicketStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'PROCESSING'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED';

export interface ReplAiTicket {
  id: string;
  subject: string;
  status: ReplAiTicketStatus;
  priority: 'HIGH' | 'MID' | 'LOW';
  slaPolicyId: string;
  /** epoch-ms (D6 MIN-3 family: numeric deadlines, not ISO strings). */
  deadlineDateTime: number;
  confidence: number;
  assignee: string;
  escalationLevel: number;
  /** AI auto-classification (R2 K2 要素⑥); `category` starts equal and an
   * agent may override it together with priority via `classify`. */
  aiCategory: string;
  category: string;
  /** Internal note (R2 K2 要素⑧) — agent-only, never sent to the customer. */
  internalNote: string;
}

export interface ReplAiTicketAction {
  id: string;
  ticketId: string;
  actionType: 'create' | 'assign' | 'start' | 'resolve' | 'close' | 'reopen' | 'escalate' | 'reply';
  fromStatus: string;
  toStatus: string;
  operator: string;
  comment: string;
  createdAt: number;
}

/** K2 hook surface: the two mutation mirrors are the only hooks the delegate
 * touches (the full `ReplAiTestHooks` stays in the main module). */
export interface ReplAiK2Hooks {
  /** Mirror: last `ticketMutation` request body (field-by-field evidence). */
  lastTicketMutationBody?: Record<string, unknown>;
  /** Mirror: last `ticketReply` request body. */
  lastTicketReplyBody?: Record<string, unknown>;
}

export interface ReplAiK2BranchInput {
  url: string;
  method: string;
  read: (key: string) => string | undefined;
  body: Record<string, unknown>;
  /** Structural subset of the repl-ai session state — keeps this delegate
   * module import-clean of `mock-backend-repl-ai.ts` (deps-baseline cycle,
   * wms-stock precedent). */
  session: {
    tickets: ReplAiTicket[];
    ticketActions: ReplAiTicketAction[];
    actionSeq: number;
  };
  hooks: ReplAiK2Hooks | undefined;
}

const K2_TICKET_COUNT = 28;

const K2_STATUS_TITLES: Record<ReplAiTicketStatus, string> = {
  OPEN: '待受理',
  ASSIGNED: '已派单',
  PROCESSING: '处理中',
  RESOLVED: '已解决',
  CLOSED: '已关闭',
  REOPENED: '已重开',
};

/** Column order = workflow order; the mock owns the ordering (W2/C1 live
 * shape — `columnsConfig` does not create columns). */
const K2_BOARD_STATUSES = Object.keys(K2_STATUS_TITLES) as ReplAiTicketStatus[];

const K2_SUBJECTS = [
  '无法登录控制台',
  '导出报表超时',
  '数据大屏白屏',
  '权限配置不生效',
  '消息通知延迟',
  '移动端扫码失败',
  '接口返回 500',
  '看板列计数为 0',
  '附件上传失败',
  '审批流卡在节点',
];

const K2_ASSIGNEES = ['坐席-林晓', '坐席-陈晨', '坐席-王蓉', '坐席-赵磊', '坐席-周航'];

const K2_PRIORITIES: ReplAiTicket['priority'][] = ['HIGH', 'MID', 'LOW'];
/** AI classification taxonomy (deterministic per ticket index). */
export const K2_CATEGORIES = ['账户与登录', '订单与物流', '支付与退款', '产品故障'] as const;

/** Deadline offsets per status (minutes relative to session creation now).
 * OPEN = the G9 designated window (TCK-0001 → +90min); REOPENED breached
 * (−45min) so the 超 SLA stat tile counts the four reopened rows. */
const K2_DEADLINE_MINUTES: Record<ReplAiTicketStatus, number> = {
  OPEN: 90,
  ASSIGNED: 180,
  PROCESSING: 240,
  RESOLVED: 48 * 60,
  CLOSED: 48 * 60,
  REOPENED: -45,
};

function statusFor(i: number): ReplAiTicketStatus {
  if (i <= 6) return 'OPEN';
  if (i <= 11) return 'ASSIGNED';
  if (i <= 16) return 'PROCESSING';
  if (i <= 20) return 'RESOLVED';
  if (i <= 24) return 'CLOSED';
  return 'REOPENED';
}

/** Trajectory history per status (ASC) — every ticket's timeline has ≥1
 * operator/actionType row (§5.2). */
const K2_TRAJECTORY: Record<ReplAiTicketStatus, ReplAiTicketAction['actionType'][]> = {
  OPEN: ['create'],
  ASSIGNED: ['create', 'assign'],
  PROCESSING: ['create', 'assign', 'start'],
  RESOLVED: ['create', 'assign', 'start', 'resolve'],
  CLOSED: ['create', 'assign', 'start', 'resolve', 'close'],
  REOPENED: ['create', 'assign', 'start', 'resolve', 'reopen'],
};

const K2_ACTION_LABELS: Record<ReplAiTicketAction['actionType'], string> = {
  create: '创建工单',
  assign: '派单',
  start: '开始处理',
  resolve: '标记解决',
  close: '关闭',
  reopen: '重开',
  escalate: '升级',
  reply: '回复客户',
};

/** Seeded-action status transitions (fixed per action type — the trajectory
 * ladder; the LIVE ticketMutation route is `K2_MUTATION_ROUTES` below). */
const K2_ACTION_TRANSITIONS: Record<string, { from: string; to: string }> = {
  create: { from: '', to: 'OPEN' },
  assign: { from: 'OPEN', to: 'ASSIGNED' },
  start: { from: 'ASSIGNED', to: 'PROCESSING' },
  resolve: { from: 'PROCESSING', to: 'RESOLVED' },
  close: { from: 'RESOLVED', to: 'CLOSED' },
  reopen: { from: 'RESOLVED', to: 'REOPENED' },
};

const K2_ACTION_LEVELS: Record<ReplAiTicketAction['actionType'], string> = {
  create: 'default',
  assign: 'info',
  start: 'primary',
  resolve: 'success',
  close: 'success',
  reopen: 'warning',
  escalate: 'error',
  reply: 'info',
};

function pad4(value: number): string {
  return String(value).padStart(4, '0');
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function formatTs(epochMs: number): string {
  const d = new Date(epochMs);
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${hm}`;
}

export function createReplAiK2Seed(): {
  tickets: ReplAiTicket[];
  ticketActions: ReplAiTicketAction[];
  actionSeq: number;
} {
  const now = Date.now();
  const tickets: ReplAiTicket[] = [];
  const ticketActions: ReplAiTicketAction[] = [];

  for (let i = 1; i <= K2_TICKET_COUNT; i += 1) {
    const status = statusFor(i);
    const assignee = K2_ASSIGNEES[(i - 1) % K2_ASSIGNEES.length];
    const subject = K2_SUBJECTS[(i - 1) % K2_SUBJECTS.length];
    const confidence = i === 3 ? 0.42 : 0.86 + ((i * 7) % 3) * 0.04;
    tickets.push({
      id: `TCK-${pad4(i)}`,
      subject,
      status,
      priority: K2_PRIORITIES[(i - 1) % K2_PRIORITIES.length],
      slaPolicyId: i % 2 === 0 ? 'SLA-VIP' : 'SLA-STD',
      deadlineDateTime: now + K2_DEADLINE_MINUTES[status] * 60_000,
      confidence,
      assignee,
      escalationLevel: i === 25 ? 1 : 0,
      aiCategory: K2_CATEGORIES[(i - 1) % K2_CATEGORIES.length],
      category: K2_CATEGORIES[(i - 1) % K2_CATEGORIES.length],
      internalNote: '',
    });

    const trajectory = K2_TRAJECTORY[status];
    trajectory.forEach((actionType, step) => {
      const operator =
        actionType === 'create' ? '系统' : actionType === 'assign' ? '值班经理' : assignee;
      const comment =
        actionType === 'create'
          ? '客户提交工单，进入待受理队列'
          : actionType === 'assign'
            ? `派单至 ${assignee}`
            : actionType === 'reopen'
              ? '客户反馈未解决，重开工单'
              : `${K2_ACTION_LABELS[actionType]}：${subject}`;
      const transition = K2_ACTION_TRANSITIONS[actionType];
      ticketActions.push({
        id: `taction-${pad4(i)}-${step + 1}`,
        ticketId: `TCK-${pad4(i)}`,
        actionType,
        fromStatus: transition.from,
        toStatus: transition.to,
        operator,
        comment,
        createdAt: now - (trajectory.length - step) * 3_600_000 + i * 60_000,
      });
    });
  }

  return { tickets, ticketActions, actionSeq: 0 };
}

function ticketReadViews(tickets: ReplAiTicket[]): Record<string, unknown>[] {
  const now = Date.now();
  return tickets.map((ticket) => ({
    ...ticket,
    slaRemainingMinutes: Math.round((ticket.deadlineDateTime - now) / 60_000),
  }));
}

/** Flat kanban BoardData (root + six status columns + ticket cards), the
 * W2/C1 live shape. */
export function buildReplTicketBoardData(tickets: ReplAiTicket[]): Record<string, unknown> {
  const board: Record<string, unknown> = {};
  const rootChildren: string[] = [];

  for (const status of K2_BOARD_STATUSES) {
    const columnTickets = tickets.filter((ticket) => ticket.status === status);
    const cardIds: string[] = [];
    for (const view of ticketReadViews(columnTickets)) {
      const cardData = { ...view, title: view.subject };
      board[view.id as string] = {
        id: view.id,
        type: 'card',
        parentId: status,
        children: [],
        data: cardData,
        meta: {},
      };
      cardIds.push(view.id as string);
    }
    board[status] = {
      id: status,
      type: 'column',
      parentId: 'root',
      children: cardIds,
      data: { title: `${K2_STATUS_TITLES[status]}（${status}）` },
      meta: {},
    };
    rootChildren.push(status);
  }

  board['root'] = { id: 'root', type: 'root', children: rootChildren, data: {}, meta: {} };
  return board;
}

function ticketStats(tickets: ReplAiTicket[]): Record<string, unknown> {
  const now = Date.now();
  const activeStatuses = new Set(['OPEN', 'ASSIGNED', 'PROCESSING', 'REOPENED']);
  return {
    openCount: tickets.filter((ticket) => ticket.status === 'OPEN').length,
    slaBreachedCount: tickets.filter(
      (ticket) => ticket.deadlineDateTime < now && activeStatuses.has(ticket.status),
    ).length,
    resolvedTodayCount: tickets.filter((ticket) => ticket.status === 'RESOLVED').length,
    avgFirstResponseMinutes: 26,
    responseSpark: [18, 22, 25, 21, 27, 24, 26],
  };
}

function timelineFor(actions: ReplAiTicketAction[], ticketId: string): Record<string, unknown>[] {
  return actions
    .filter((action) => action.ticketId === ticketId)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((action) => ({
      value: action.id,
      time: formatTs(action.createdAt),
      title: `${K2_ACTION_LABELS[action.actionType]}（${action.actionType}） · ${action.operator}`,
      detail: action.comment,
      level: K2_ACTION_LEVELS[action.actionType],
      actionType: action.actionType,
      operator: action.operator,
      fromStatus: action.fromStatus,
      toStatus: action.toStatus,
    }));
}

function suggestionsFor(tickets: ReplAiTicket[], ticketId: string): Record<string, unknown>[] {
  const ticket = tickets.find((row) => row.id === ticketId);
  if (!ticket) return [];
  return [
    {
      id: `sugg-${ticket.id}-1`,
      ticketId: ticket.id,
      text: `您好，关于「${ticket.subject}」的问题我们深表歉意，已为您加急处理，预计 2 小时内给您答复。`,
      confidence: ticket.confidence,
    },
    {
      id: `sugg-${ticket.id}-2`,
      ticketId: ticket.id,
      text: '您好，该问题已定位原因并给出处理方案，请查收站内信中的详细说明，如仍有疑问欢迎随时联系我们。',
      confidence: Math.min(ticket.confidence + 0.03, 0.99),
    },
  ];
}

const K2_MUTATION_ROUTES: Record<
  string,
  Partial<Record<ReplAiTicketStatus, ReplAiTicketStatus>>
> = {
  assign: { OPEN: 'ASSIGNED' },
  start: { ASSIGNED: 'PROCESSING' },
  resolve: { PROCESSING: 'RESOLVED' },
  close: { RESOLVED: 'CLOSED' },
  reopen: { RESOLVED: 'REOPENED' },
};

/** escalate keeps every non-CLOSED status in place (CLOSED is terminal). */
function routeMutation(mutation: string, from: ReplAiTicketStatus): ReplAiTicketStatus | undefined {
  if (mutation === 'escalate') return from === 'CLOSED' ? undefined : from;
  return K2_MUTATION_ROUTES[mutation]?.[from];
}

export function handleReplAiK2Branch<T>(
  input: ReplAiK2BranchInput,
): { status: number; data: T } | null {
  const { url, method, read, body, session, hooks } = input;

  if (url.includes('/r/ReplAi__ticketFindPage') && method === 'get') {
    const status = read('status') ?? '';
    const allViews = ticketReadViews(session.tickets);
    const items = status ? allViews.filter((view) => view.status === status) : allViews;
    return {
      status: 0,
      data: {
        items,
        total: items.length,
        board: buildReplTicketBoardData(session.tickets),
        stats: ticketStats(session.tickets),
      } as unknown as T,
    };
  }

  if (url.includes('/r/ReplAi__ticketActionFind') && method === 'get') {
    const ticketId = read('ticketId') ?? '';
    const items = timelineFor(session.ticketActions, ticketId);
    return { status: 0, data: { items, total: items.length } as unknown as T };
  }

  if (url.includes('/r/ReplAi__ticketMutation') && method === 'post') {
    if (hooks) hooks.lastTicketMutationBody = { ...body };
    const id = typeof body.id === 'string' ? body.id : '';
    const mutation = typeof body.mutation === 'string' ? body.mutation : '';
    const ticket = session.tickets.find((row) => row.id === id);
    // `classify` (R2 K2 要素⑥⑧, plan 819 P1): agent override of the AI
    // category/priority + internal note — a non-transitional mutation.
    if (mutation === 'classify' && ticket) {
      const priority = body.priority;
      if (typeof body.category === 'string' && body.category) ticket.category = body.category;
      if (priority === 'HIGH' || priority === 'MID' || priority === 'LOW') ticket.priority = priority;
      if (typeof body.internalNote === 'string') ticket.internalNote = body.internalNote;
      return {
        status: 0,
        data: {
          id: ticket.id,
          mutation,
          category: ticket.category,
          priority: ticket.priority,
          internalNote: ticket.internalNote,
        } as unknown as T,
      };
    }
    const toStatus = ticket && mutation ? routeMutation(mutation, ticket.status) : undefined;
    if (!ticket || !mutation || !toStatus) {
      return {
        status: 1,
        data: {
          msg: 'ILLEGAL_TRANSITION',
          id,
          mutation,
          fromStatus: ticket?.status ?? '',
        } as unknown as T,
      };
    }
    const fromStatus = ticket.status;
    ticket.status = toStatus;
    if (mutation === 'escalate') ticket.escalationLevel += 1;
    session.actionSeq += 1;
    session.ticketActions.push({
      id: `taction-db-${String(session.actionSeq).padStart(3, '0')}`,
      ticketId: ticket.id,
      actionType: mutation as ReplAiTicketAction['actionType'],
      fromStatus,
      toStatus,
      operator: '坐席-当前',
      comment: `${K2_ACTION_LABELS[mutation as ReplAiTicketAction['actionType']]}：${ticket.subject}`,
      createdAt: Date.now(),
    });
    return {
      status: 0,
      data: {
        id: ticket.id,
        mutation,
        fromStatus,
        toStatus,
        escalationLevel: ticket.escalationLevel,
      } as unknown as T,
    };
  }

  if (url.includes('/r/ReplAi__ticketReply') && method === 'post') {
    if (hooks) hooks.lastTicketReplyBody = { ...body };
    const ticketId = typeof body.ticketId === 'string' ? body.ticketId : '';
    const reply = typeof body.reply === 'string' ? body.reply : '';
    const ticket = session.tickets.find((row) => row.id === ticketId);
    if (!ticket || !reply) {
      return { status: 1, data: { msg: 'ticketReply requires {ticketId, reply}' } as unknown as T };
    }
    session.actionSeq += 1;
    session.ticketActions.push({
      id: `taction-db-${String(session.actionSeq).padStart(3, '0')}`,
      ticketId: ticket.id,
      actionType: 'reply',
      fromStatus: ticket.status,
      toStatus: ticket.status,
      operator: '坐席-当前',
      comment: reply,
      createdAt: Date.now(),
    });
    return { status: 0, data: { ticketId: ticket.id, replied: true } as unknown as T };
  }

  if (url.includes('/r/ReplAi__suggestionFind') && method === 'get') {
    const ticketId = read('ticketId') ?? '';
    const items = suggestionsFor(session.tickets, ticketId);
    return { status: 0, data: { items, total: items.length } as unknown as T };
  }

  return null;
}
