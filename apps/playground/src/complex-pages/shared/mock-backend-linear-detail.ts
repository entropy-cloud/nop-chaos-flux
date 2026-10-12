/**
 * Linear-style tracker replica — issue detail assembly (plan
 * 2026-08-30-0040-1 P4b Phase 1 module split). Pure projection over the
 * issue dataset: description paragraphs, sub-issues, deterministic relations,
 * and the activity timeline. Unknown ids fall back to a placeholder record
 * (ln-detail-miss) instead of crashing.
 */

import {
  LINEAR_ASSIGNEES,
  LINEAR_PRIORITY_LABELS,
  LINEAR_STATUS_LABELS,
  LINEAR_TITLES,
  type LinearIssue,
  type LinearIssueListRow,
  type LinearIssueStatus,
  toLinearIssueRow,
} from './mock-backend-linear-issues';

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
