/**
 * Business-replication AI mock backend — K3 approval-trail endpoint subset
 * (plan 808; D3 §4.3 ai table K3 five rows, named verbatim). Delegate module
 * under the plan-807 450-line module gate, same pattern as the K2 delegate
 * (`mock-backend-repl-ai-k2.ts`): the `/r/ReplAi__` fetcher branch stays in
 * the main module (single endpoint-counter call site per request) and hands
 * unmatched K3 urls to `handleReplAiK3Branch`.
 *
 * Endpoints:
 * - get  `approvalTaskFindPage` — {items, total}: 12-task todo queue over the
 *   four ErpCsTicket-family approveStatus values (UNSUBMITTED/SUBMITTED/
 *   APPROVED/REJECTED). Each read view projects the D3 §2.3 drawer payload:
 *   `approveSteps` (the four-entry steps items with the authoritative
 *   wait/process/finish/error mapping — the live steps renderer derives
 *   wait/process/finish from the current value but has NO error derivation,
 *   so the REJECTED step's `status: 'error'` must ride on explicit item
 *   status from the mock), `hitlToolCall` (ChatToolCall shape) and
 *   `hitlToolCallState` ({status, approval}) for HITL-bearing tasks.
 * - get  `approvalTrailFind?taskId=` — trajectory {items, total} projected
 *   onto the live TimelineItemSchema shape (value/time/title/detail/level),
 *   ASC. Reject nodes carry `level: 'error'` (§5.3 配色断言), transfer nodes
 *   `level: 'info'`.
 * - post `approvalAct`    — approve/reject. Guards: unknown task →
 *   `TASK_NOT_FOUND`; non-SUBMITTED row → `APPROVAL_CONFLICT`; reject without
 *   comment → `REJECT_COMMENT_REQUIRED`; `__replAiTestHooks.failNextMutation`
 *   → `APPROVAL_CONFLICT` (D3 §4.3 error branch). Success mutates the session
 *   row + appends a trail node.
 * - post `approvalTransfer` — G13 transfer (user-select + reason). Guards:
 *   unknown task / missing target or reason → `TRANSFER_PAYLOAD_INVALID`.
 *   Success appends a `transfer` trail node (operator = target user) and
 *   moves the row's `currentNode`.
 * - post `hitlDecision`   — HITL pending→decided persistence (D3 §6.5: the
 *   ai-tool-call engine does NOT mutate `approval`; this endpoint is the
 *   host-owned workflow). Guards: unknown callId → `HITL_CALL_NOT_FOUND`;
 *   already decided → `HITL_ALREADY_DECIDED`. Success flips the row's
 *   `hitlApproval` (the schema action chain mirrors it into the card state
 *   via setValue — engine stays read-only).
 *
 * User ids for the transfer dialog mirror the static org options declared in
 * `page-schemas/ai-approval-trail.json` (reference data, not business rows).
 *
 * Import-clean of the main module (deps-baseline no-cycle): the session
 * subset travels in through the structural `ReplAiK3BranchInput.session` and
 * the hook mirrors write through the structural `hooks` subset.
 */

export type ReplAiApproveStatus = 'UNSUBMITTED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type ReplAiApprovalActionType = 'create' | 'submit' | 'approve' | 'reject' | 'transfer';

export interface ReplAiApprovalTask {
  id: string;
  subject: string;
  approveStatus: ReplAiApproveStatus;
  submitter: string;
  currentNode: string;
  createdAt: number;
  /** HITL tool-call id; absent = the task carries no HITL card. */
  hitlToolCallId?: string;
  /** HITL workflow state ('pending' until a hitlDecision lands). */
  hitlApproval?: 'pending' | 'approved' | 'rejected';
}

export interface ReplAiApprovalTrailNode {
  id: string;
  taskId: string;
  actionType: ReplAiApprovalActionType;
  operator: string;
  comment: string;
  level: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  createdAt: number;
}

/** K3 hook surface: the three mutation mirrors (the full `ReplAiTestHooks`
 * stays in the main module). */
export interface ReplAiK3Hooks {
  /** Mirror: last `approvalAct` request body (field-by-field evidence). */
  lastApprovalActBody?: Record<string, unknown>;
  /** Mirror: last `approvalTransfer` request body. */
  lastApprovalTransferBody?: Record<string, unknown>;
  /** Mirror: last `hitlDecision` request body. */
  lastHitlDecisionBody?: Record<string, unknown>;
  /** Shared fail-next flag (approvalAct → APPROVAL_CONFLICT). */
  failNextMutation?: boolean;
}

export interface ReplAiK3BranchInput {
  url: string;
  method: string;
  read: (key: string) => string | undefined;
  body: Record<string, unknown>;
  /** Structural subset of the repl-ai session state — keeps this delegate
   * module import-clean of `mock-backend-repl-ai.ts` (deps-baseline cycle,
   * K2/wms-stock precedent). */
  session: {
    approvalTasks: ReplAiApprovalTask[];
    approvalTrail: ReplAiApprovalTrailNode[];
    approvalSeq: number;
  };
  hooks: ReplAiK3Hooks | undefined;
}

const K3_TASK_COUNT = 12;

const K3_APPROVE_STATUS_LABELS: Record<ReplAiApproveStatus, string> = {
  UNSUBMITTED: '未提交',
  SUBMITTED: '待审批',
  APPROVED: '已通过',
  REJECTED: '已驳回',
};

/** Transfer-dialog user directory — mirrors the static org options in
 * `page-schemas/ai-approval-trail.json`. */
const K3_USER_NAMES: Record<string, string> = {
  'user-zhangsan': '张三',
  'user-lisi': '李四',
  'user-wangwu': '王五',
  'user-zhaoliu': '赵六',
};

interface K3TaskSeed {
  subject: string;
  submitter: string;
  currentNode: string;
  approveStatus: ReplAiApproveStatus;
  hitl?: 'pending' | 'approved' | 'rejected';
}

/** Seed order keeps all four approveStatus values inside crud page 1
 * (default pageSize 10): rows 1-9 carry every fixture the §5.3 assertions
 * target (HITL pending 1/7, reject-target 3, transfer-target 4, steps
 * mapping 1/2/5/6). */
const K3_TASK_SEEDS: K3TaskSeed[] = [
  { subject: '生产环境发布窗口', submitter: '赵六', currentNode: '总监审批', approveStatus: 'SUBMITTED', hitl: 'pending' },
  { subject: '服务器扩容采购申请', submitter: '张三', currentNode: '部门审批', approveStatus: 'UNSUBMITTED' },
  { subject: '供应商合同续签', submitter: '张三', currentNode: '总监审批', approveStatus: 'SUBMITTED' },
  { subject: '差旅报销单 TRV-2093', submitter: '李四', currentNode: '总监审批', approveStatus: 'SUBMITTED' },
  { subject: '办公区门禁权限变更', submitter: '赵六', currentNode: '已归档', approveStatus: 'APPROVED', hitl: 'approved' },
  { subject: '对外接口密钥申请', submitter: '王五', currentNode: '已归档', approveStatus: 'REJECTED', hitl: 'rejected' },
  { subject: '数据导出权限开通', submitter: '王五', currentNode: '总监审批', approveStatus: 'SUBMITTED', hitl: 'pending' },
  { subject: '测试环境数据库副本', submitter: '张三', currentNode: '已归档', approveStatus: 'APPROVED' },
  { subject: '会议室改造施工申请', submitter: '赵六', currentNode: '已归档', approveStatus: 'REJECTED' },
  { subject: 'Q4 市场活动预算', submitter: '李四', currentNode: '部门审批', approveStatus: 'UNSUBMITTED' },
  { subject: '年度培训计划报备', submitter: '李四', currentNode: '已归档', approveStatus: 'APPROVED' },
  { subject: '新员工入职设备领用', submitter: '王五', currentNode: '部门审批', approveStatus: 'UNSUBMITTED' },
];

const K3_ACTION_LABELS: Record<ReplAiApprovalActionType, string> = {
  create: '创建申请',
  submit: '提交申请',
  approve: '审批通过',
  reject: '审批驳回',
  transfer: '转办',
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

/**
 * The authoritative steps mapping (D3 §2.3: wait/process/finish/error).
 * REJECTED renders the APPROVED step as `wait` (branch not taken) and the
 * REJECTED step as `error`; terminal APPROVED renders fully finished.
 */
function approveStepsFor(approveStatus: ReplAiApproveStatus): Record<string, unknown>[] {
  const base = [
    { value: 'UNSUBMITTED', title: K3_APPROVE_STATUS_LABELS.UNSUBMITTED },
    { value: 'SUBMITTED', title: K3_APPROVE_STATUS_LABELS.SUBMITTED },
    { value: 'APPROVED', title: K3_APPROVE_STATUS_LABELS.APPROVED },
    { value: 'REJECTED', title: K3_APPROVE_STATUS_LABELS.REJECTED },
  ];
  const statusByValue: Record<ReplAiApproveStatus, string[]> = {
    UNSUBMITTED: ['process', 'wait', 'wait', 'wait'],
    SUBMITTED: ['finish', 'process', 'wait', 'wait'],
    APPROVED: ['finish', 'finish', 'finish', 'wait'],
    REJECTED: ['finish', 'finish', 'wait', 'error'],
  };
  return base.map((item, index) => ({
    ...item,
    status: statusByValue[approveStatus][index],
  }));
}

export function createReplAiK3Seed(): {
  approvalTasks: ReplAiApprovalTask[];
  approvalTrail: ReplAiApprovalTrailNode[];
  approvalSeq: number;
} {
  const now = Date.now();
  const approvalTasks: ReplAiApprovalTask[] = [];
  const approvalTrail: ReplAiApprovalTrailNode[] = [];

  K3_TASK_SEEDS.forEach((seed, index) => {
    const taskId = `APT-${pad4(index + 1)}`;
    approvalTasks.push({
      id: taskId,
      subject: seed.subject,
      approveStatus: seed.approveStatus,
      submitter: seed.submitter,
      currentNode: seed.currentNode,
      createdAt: now - (K3_TASK_COUNT - index) * 3_600_000,
      hitlToolCallId: seed.hitl ? `call-${taskId.toLowerCase()}` : undefined,
      hitlApproval: seed.hitl,
    });

    const nodes: Array<Pick<ReplAiApprovalTrailNode, 'actionType' | 'operator' | 'comment' | 'level'>> = [
      {
        actionType: 'create',
        operator: '系统',
        comment: `${seed.submitter} 创建申请「${seed.subject}」`,
        level: 'default',
      },
    ];
    if (seed.approveStatus !== 'UNSUBMITTED') {
      nodes.push({
        actionType: 'submit',
        operator: seed.submitter,
        comment: '提交进入审批流',
        level: 'primary',
      });
    }
    if (seed.approveStatus === 'APPROVED') {
      nodes.push({
        actionType: 'approve',
        operator: '总监-周敏',
        comment: '同意，按预算执行',
        level: 'success',
      });
    }
    if (seed.approveStatus === 'REJECTED') {
      nodes.push({
        actionType: 'reject',
        operator: '总监-周敏',
        comment: '依据不充分，退回补充材料',
        level: 'error',
      });
    }
    nodes.forEach((node, step) => {
      approvalTrail.push({
        id: `atrail-${pad4(index + 1)}-${step + 1}`,
        taskId,
        ...node,
        createdAt: now - (K3_TASK_COUNT - index) * 3_600_000 + (step + 1) * 60_000,
      });
    });
  });

  return { approvalTasks, approvalTrail, approvalSeq: 0 };
}

function hitlToolCallView(task: ReplAiApprovalTask): Record<string, unknown> | undefined {
  if (!task.hitlToolCallId) return undefined;
  return {
    index: 0,
    id: task.hitlToolCallId,
    type: 'function',
    function: {
      name: 'request_approval_decision',
      arguments: JSON.stringify({ taskId: task.id, subject: task.subject }),
    },
  };
}

function hitlToolCallStateView(task: ReplAiApprovalTask): Record<string, unknown> | undefined {
  if (!task.hitlToolCallId) return undefined;
  return { status: 'success', approval: task.hitlApproval ?? 'pending' };
}

function taskReadView(task: ReplAiApprovalTask): Record<string, unknown> {
  return {
    ...task,
    approveStatusLabel: K3_APPROVE_STATUS_LABELS[task.approveStatus],
    approveSteps: approveStepsFor(task.approveStatus),
    hitlToolCall: hitlToolCallView(task),
    hitlToolCallState: hitlToolCallStateView(task),
  };
}

function timelineFor(nodes: ReplAiApprovalTrailNode[], taskId: string): Record<string, unknown>[] {
  return nodes
    .filter((node) => node.taskId === taskId)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((node) => ({
      value: node.id,
      time: formatTs(node.createdAt),
      title: `${K3_ACTION_LABELS[node.actionType]}（${node.actionType}） · ${node.operator}`,
      detail: node.comment,
      level: node.level,
      actionType: node.actionType,
      operator: node.operator,
    }));
}

function error<T>(msg: string): { status: number; data: T } {
  return { status: 1, data: { msg } as unknown as T };
}

export function handleReplAiK3Branch<T>(
  input: ReplAiK3BranchInput,
): { status: number; data: T } | null {
  const { url, method, read, body, session, hooks } = input;

  if (url.includes('/r/ReplAi__approvalTaskFindPage') && method === 'get') {
    const approveStatus = read('approveStatus') ?? '';
    const allViews = session.approvalTasks.map(taskReadView);
    const items = approveStatus
      ? allViews.filter((view) => view.approveStatus === approveStatus)
      : allViews;
    return { status: 0, data: { items, total: items.length } as unknown as T };
  }

  if (url.includes('/r/ReplAi__approvalTrailFind') && method === 'get') {
    const taskId = read('taskId') ?? '';
    const items = timelineFor(session.approvalTrail, taskId);
    return { status: 0, data: { items, total: items.length } as unknown as T };
  }

  if (url.includes('/r/ReplAi__approvalAct') && method === 'post') {
    if (hooks) hooks.lastApprovalActBody = { ...body };
    if (hooks?.failNextMutation === true) {
      hooks.failNextMutation = false;
      return error('APPROVAL_CONFLICT');
    }
    const taskId = typeof body.taskId === 'string' ? body.taskId : '';
    const decision = body.decision === 'approve' || body.decision === 'reject' ? body.decision : '';
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
    const task = session.approvalTasks.find((row) => row.id === taskId);
    if (!task) return error('TASK_NOT_FOUND');
    if (!decision) return error('APPROVAL_PAYLOAD_INVALID');
    if (task.approveStatus !== 'SUBMITTED') return error('APPROVAL_CONFLICT');
    if (decision === 'reject' && !comment) return error('REJECT_COMMENT_REQUIRED');

    task.approveStatus = decision === 'approve' ? 'APPROVED' : 'REJECTED';
    task.currentNode = '已归档';
    session.approvalSeq += 1;
    session.approvalTrail.push({
      id: `atrail-db-${String(session.approvalSeq).padStart(3, '0')}`,
      taskId: task.id,
      actionType: decision,
      operator: '审批人-当前',
      comment: comment || '同意，按预算执行',
      level: decision === 'approve' ? 'success' : 'error',
      createdAt: Date.now(),
    });
    return {
      status: 0,
      data: { id: task.id, decision, approveStatus: task.approveStatus } as unknown as T,
    };
  }

  if (url.includes('/r/ReplAi__approvalTransfer') && method === 'post') {
    if (hooks) hooks.lastApprovalTransferBody = { ...body };
    const taskId = typeof body.taskId === 'string' ? body.taskId : '';
    const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const task = session.approvalTasks.find((row) => row.id === taskId);
    const targetName = K3_USER_NAMES[targetUserId];
    if (!task || !targetName || !reason) return error('TRANSFER_PAYLOAD_INVALID');

    task.currentNode = targetName;
    session.approvalSeq += 1;
    session.approvalTrail.push({
      id: `atrail-db-${String(session.approvalSeq).padStart(3, '0')}`,
      taskId: task.id,
      actionType: 'transfer',
      operator: targetName,
      comment: reason,
      level: 'info',
      createdAt: Date.now(),
    });
    return {
      status: 0,
      data: { id: task.id, targetUserId, targetName, currentNode: task.currentNode } as unknown as T,
    };
  }

  if (url.includes('/r/ReplAi__hitlDecision') && method === 'post') {
    if (hooks) hooks.lastHitlDecisionBody = { ...body };
    const callId = typeof body.callId === 'string' ? body.callId : '';
    const decision = body.decision === 'approve' || body.decision === 'reject' ? body.decision : '';
    const task = session.approvalTasks.find((row) => row.hitlToolCallId === callId);
    if (!task || !decision) return error('HITL_CALL_NOT_FOUND');
    if (task.hitlApproval !== 'pending') return error('HITL_ALREADY_DECIDED');

    const approval: ReplAiApprovalTask['hitlApproval'] = decision === 'approve' ? 'approved' : 'rejected';
    task.hitlApproval = approval;
    return {
      status: 0,
      data: { callId, decision, approval } as unknown as T,
    };
  }

  return null;
}
