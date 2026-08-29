import { describe, expect, it } from 'vitest';
import type { ApiRequestContext } from '@nop-chaos/flux-core';
import {
  LINEAR_BOARD_COLUMNS,
  LINEAR_PRIORITY_LABELS,
  LINEAR_STATUS_LABELS,
  archiveLinearIssues,
  buildLinearBoardData,
  buildLinearIssueDetail,
  bulkUpdateLinearIssues,
  countLinearUnread,
  createLinearCommands,
  createLinearDatabase,
  createLinearFetcherBranch,
  createLinearInbox,
  createLinearIssueRecord,
  createLinearIssues,
  createLinearProjects,
  filterLinearIssues,
  moveLinearCard,
  nextLinearIssueId,
  paginateLinear,
  toLinearIssueRow,
  updateLinearInbox,
} from '../shared/mock-backend-linear';
import { createShowcaseEnv } from '../shared/showcase-env';
import { COMPLEX_PAGE_ENTRIES } from '../complex-pages-model';

const fetchCtx = { scope: null } as unknown as ApiRequestContext;

describe('Linear mock backend — issue dataset', () => {
  it('ships ≥30 issues so the default pageSize 10 yields ≥3 pages', () => {
    const issues = createLinearIssues();
    expect(issues.length).toBeGreaterThanOrEqual(30);
    const paged = paginateLinear(issues, 1, 10);
    expect(paged.pages).toBeGreaterThanOrEqual(3);
    expect(paged.total).toBe(issues.length);
  });

  it('covers every status and priority with labels; rows carry ln-* class bindings', () => {
    const issues = createLinearIssues();
    const statuses = new Set(issues.map((i) => i.status));
    for (const status of Object.keys(LINEAR_STATUS_LABELS)) {
      expect(statuses.has(status as keyof typeof LINEAR_STATUS_LABELS), `status ${status}`).toBe(true);
    }
    const priorities = new Set(issues.map((i) => i.priority));
    for (const priority of Object.keys(LINEAR_PRIORITY_LABELS)) {
      expect(priorities.has(priority as keyof typeof LINEAR_PRIORITY_LABELS), `priority ${priority}`).toBe(true);
    }

    const row = toLinearIssueRow(issues[1]);
    expect(row.statusLabel).toBe(LINEAR_STATUS_LABELS[row.status]);
    expect(row.priorityLabel).toBe(LINEAR_PRIORITY_LABELS[row.priority]);
    expect(row.statusDotClass).toBe(`ln-status-dot ln-status-${row.status}`);
    expect(row.statusPillClass).toBe(`ln-pill ln-pill-${row.status}`);
    expect(row.prioClass).toBe(`ln-prio ln-prio-${row.priority}`);
    expect(row.priorityPillClass).toBe(`ln-pill ln-pill-${row.priority}`);
    expect(row.assigneeInitials).toBe(row.assignee.initials);
  });

  it('rows cover labels, assignees, due dates, and estimates', () => {
    const issues = createLinearIssues();
    expect(issues.some((i) => i.labels.length > 0)).toBe(true);
    expect(issues.some((i) => i.labels.length === 0)).toBe(true);
    expect(issues.every((i) => i.assignee.name.length > 0 && i.assignee.initials.length > 0)).toBe(true);
    expect(issues.some((i) => i.dueDate !== '')).toBe(true);
    expect(issues.some((i) => i.dueDate === '')).toBe(true);
    expect(issues.every((i) => i.estimate >= 0)).toBe(true);
    expect(issues.some((i) => i.dueDate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(i.dueDate))).toBe(false);
  });

  it('ln-issues-miss: unmatched filters return an empty array without error', () => {
    const issues = createLinearIssues();
    expect(filterLinearIssues(issues, { keyword: '绝不存在的关键词xyz' })).toEqual([]);
    expect(filterLinearIssues(issues, { status: 'nope' })).toEqual([]);
    expect(filterLinearIssues(issues, { priority: 'nope' })).toEqual([]);
    expect(filterLinearIssues(issues, { label: '不存在标签' })).toEqual([]);
    expect(filterLinearIssues(issues, { assignee: '不存在的人' })).toEqual([]);
  });

  it('status filter narrows to the requested group only', () => {
    const rows = filterLinearIssues(createLinearIssues(), { status: 'in_progress' });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.status === 'in_progress')).toBe(true);
  });
});

describe('Linear mock backend — board view', () => {
  it('builds root + 5 status columns + cards with BoardData structure and counts', () => {
    const issues = createLinearIssues();
    const { board, columns } = buildLinearBoardData(issues);
    expect((board['root'] as { type: string }).type).toBe('root');
    expect(columns.map((c) => c.id)).toEqual(LINEAR_BOARD_COLUMNS.map((c) => `col-${c.id}`));
    const rootChildren = (board['root'] as { children: string[] }).children;
    expect(rootChildren).toHaveLength(LINEAR_BOARD_COLUMNS.length);
    let cardTotal = 0;
    for (const col of LINEAR_BOARD_COLUMNS) {
      const colId = `col-${col.id}`;
      const colNode = board[colId] as { type: string; children: string[]; data: { title: string } };
      expect(colNode.type).toBe('column');
      expect(colNode.data.title).toBe(col.title);
      const count = issues.filter((i) => i.status === col.id).length;
      expect(colNode.children).toHaveLength(count);
      expect(columns.find((c) => c.id === colId)?.count).toBe(count);
      for (const cardId of colNode.children) {
        const card = board[cardId] as { type: string; parentId: string; data: Record<string, unknown>; meta: Record<string, unknown> };
        expect(card.type).toBe('card');
        expect(card.parentId).toBe(colId);
        // default card face: title + identifier/estimate description line
        expect(String(card.data.title).length).toBeGreaterThan(0);
        expect(String(card.data.description)).toMatch(/^ENG-\d+ · 估算 \d+$/);
        // meta: priority accent + label pills + assignee initials circle
        const tags = card.meta.tags as Array<{ text: string }>;
        const members = card.meta.members as Array<{ name: string }>;
        expect(members.length).toBe(1);
        expect(members[0].name.length).toBeGreaterThan(0);
        expect(tags.length).toBeGreaterThanOrEqual(0);
        cardTotal += 1;
      }
    }
    expect(cardTotal).toBe(issues.length);
  });

  it('maps the priority accent color onto the card color dot', () => {
    const issues = createLinearIssues();
    const urgent = issues.find((i) => i.priority === 'urgent')!;
    const { board } = buildLinearBoardData(issues);
    const card = board[`card-${urgent.id}`] as { meta: { color: string } };
    expect(card.meta.color).toBe('#e53935');
  });
});

describe('Linear mock backend — inbox', () => {
  it('groups notifications into today/week/earlier with read + unread samples', () => {
    const groups = createLinearInbox();
    expect(groups.map((g) => g.key)).toEqual(['today', 'week', 'earlier']);
    expect(groups.flatMap((g) => g.items).some((i) => i.unread)).toBe(true);
    expect(groups.flatMap((g) => g.items).some((i) => !i.unread)).toBe(true);
    const kinds = new Set(groups.flatMap((g) => g.items).map((i) => i.kind));
    expect(kinds).toContain('assigned');
    expect(kinds).toContain('mentioned');
    expect(kinds).toContain('comment');
    expect(kinds).toContain('status');
    expect(countLinearUnread(groups)).toBe(groups.flatMap((g) => g.items).filter((i) => i.unread).length);
  });

  it('ln-inbox-empty: unreadOnly filter yields empty groups without error', () => {
    const groups = createLinearInbox().map((g) => ({ ...g, items: g.items.filter((i) => !i.unread) }));
    expect(countLinearUnread(groups)).toBe(0);
    expect(groups.every((g) => Array.isArray(g.items))).toBe(true);
  });
});

describe('Linear mock backend — issue detail', () => {
  it('returns description, sub-issues, relations, and activity for the sample issue', () => {
    const detail = buildLinearIssueDetail(createLinearIssues(), 'ENG-105');
    expect(detail.id).toBe('ENG-105');
    expect(detail.description.length).toBeGreaterThanOrEqual(2);
    expect(detail.subIssues.length).toBeGreaterThanOrEqual(2);
    for (const sub of detail.subIssues) {
      expect(sub.statusDotClass).toMatch(/^ln-status-dot ln-status-/);
      expect(sub.statusLabel).toBe(LINEAR_STATUS_LABELS[sub.status]);
    }
    const relationTypes = new Set(detail.relations.map((r) => r.type));
    expect(relationTypes).toContain('blocks');
    expect(relationTypes).toContain('related');
    const activityKinds = new Set(detail.activity.map((a) => a.kind));
    expect(activityKinds).toContain('created');
    expect(activityKinds).toContain('status');
    expect(activityKinds).toContain('assign');
    expect(activityKinds).toContain('comment');
  });

  it('ln-detail-miss: unknown id returns a fallback record instead of crashing', () => {
    const detail = buildLinearIssueDetail(createLinearIssues(), 'ENG-999');
    expect(detail.placeholder).toBe(true);
    expect(detail.title).toContain('未找到');
    expect(detail.description.length).toBeGreaterThan(0);
    expect(detail.subIssues).toEqual([]);
    expect(detail.relations).toEqual([]);
    expect(detail.activity).toEqual([]);
  });
});

describe('Linear mock backend — projects + commands', () => {
  it('projects carry progress and cycle windows with active/upcoming/completed samples', () => {
    const projects = createLinearProjects();
    expect(projects.length).toBeGreaterThanOrEqual(3);
    for (const p of projects) {
      expect(p.progressText).toBe(`${Math.round(p.progress * 100)}%`);
      expect(p.cycles.length).toBeGreaterThanOrEqual(2);
      for (const c of p.cycles) {
        expect(c.progressText).toBe(`${Math.round(c.progress * 100)}%`);
        expect(c.statusPillClass).toMatch(/^ln-pill ln-pill-/);
      }
    }
    const cycleStatuses = new Set(projects.flatMap((p) => p.cycles.map((c) => c.status)));
    expect(cycleStatuses).toContain('active');
    expect(cycleStatuses).toContain('upcoming');
    expect(cycleStatuses).toContain('completed');
  });

  it('command list covers navigation/actions/search groups with shortcut hints', () => {
    const groups = createLinearCommands();
    expect(groups.map((g) => g.key)).toEqual(['navigation', 'actions', 'search']);
    expect(groups.every((g) => g.items.length >= 3)).toBe(true);
    expect(groups.flatMap((g) => g.items).every((i) => i.label.length > 0)).toBe(true);
    expect(groups.flatMap((g) => g.items).some((i) => i.kbd)).toBe(true);
  });
});

describe('Linear fetcher branch (reads + writes)', () => {
  it('foreign prefixes return null; unknown Linear write endpoints fail with status 1', () => {
    const branch = createLinearFetcherBranch(createLinearDatabase(), <T,>(v: T): T => v);
    expect(branch({ url: '/r/Other__issues', method: 'get', params: {}, body: {} })).toBeNull();
    const unknownWrite = branch({ url: '/r/Linear__nope', method: 'post', params: {}, body: {} }) as {
      status: number;
      data: { ok: boolean };
    };
    expect(unknownWrite.status).toBe(1);
    expect(unknownWrite.data.ok).toBe(false);
  });

  it('branch serves issues pagination, board view, inbox, detail, projects, commands', () => {
    const branch = createLinearFetcherBranch(createLinearDatabase(), <T,>(v: T): T => v);
    const run = (url: string) =>
      branch({ url, method: 'get', params: {}, body: {} }) as { status: number; data: Record<string, unknown> };

    const issues = run('/r/Linear__issues?page=1&perPage=10');
    expect(issues.status).toBe(0);
    expect((issues.data.items as unknown[]).length).toBe(10);
    expect(issues.data.pages).toBeGreaterThanOrEqual(3);

    const board = run('/r/Linear__issues?view=board');
    expect((board.data.board as Record<string, unknown>).root).toBeTruthy();
    expect((board.data.columns as unknown[]).length).toBe(LINEAR_BOARD_COLUMNS.length);

    const inbox = run('/r/Linear__inbox');
    expect((inbox.data.groups as unknown[]).length).toBe(3);
    expect(inbox.data.unreadCount).toBeGreaterThan(0);

    const detail = run('/r/Linear__issue?id=ENG-105');
    expect((detail.data as { id: string }).id).toBe('ENG-105');
    const miss = run('/r/Linear__issue?id=ENG-999');
    expect((miss.data as { placeholder?: boolean }).placeholder).toBe(true);

    const projects = run('/r/Linear__projects');
    expect((projects.data.items as unknown[]).length).toBeGreaterThanOrEqual(3);

    const commands = run('/r/Linear__commands');
    expect((commands.data.groups as unknown[]).length).toBe(3);
  });
});

describe('Linear showcase env wiring', () => {
  it('all five Linear__ endpoints are reachable through the showcase fetcher', async () => {
    const { env } = createShowcaseEnv();
    const get = (url: string) => env.fetcher!<Record<string, unknown>>({ url, method: 'get' }, fetchCtx);

    for (const url of [
      '/r/Linear__issues?perPage=10',
      '/r/Linear__issues?view=board',
      '/r/Linear__inbox',
      '/r/Linear__issue?id=ENG-101',
      '/r/Linear__projects',
      '/r/Linear__commands',
    ]) {
      const res = await get(url);
      expect(res.status, url).toBe(0);
      expect(res.data, url).not.toBeNull();
    }

    const issues = await get('/r/Linear__issues?perPage=10');
    expect((issues.data as { total: number }).total).toBeGreaterThanOrEqual(30);
  });

  it('non-get requests to unknown Linear endpoints surface a handled failure, not the null default', async () => {
    const { env } = createShowcaseEnv();
    const res = await env.fetcher!<unknown>({ url: '/r/Linear__issues', method: 'post' }, fetchCtx);
    expect(res.status).toBe(1);
    expect(res.data).toEqual({ ok: false, error: 'unknown Linear write endpoint' });
  });
});

describe('Linear write operations — bulkUpdate (ln-bulk-miss)', () => {
  it('applies the patch to every matched id and reports the update count', () => {
    const rows = createLinearIssues();
    const result = bulkUpdateLinearIssues(rows, {
      ids: ['ENG-101', 'ENG-102'],
      patch: { status: 'done', priority: 'low' },
    });
    expect(result).toEqual({ ok: true, updated: 2 });
    expect(rows.find((r) => r.id === 'ENG-101')!.status).toBe('done');
    expect(rows.find((r) => r.id === 'ENG-102')!.priority).toBe('low');
  });

  it('accepts flat patch keys (dialog-form alias) and resolves assignee names', () => {
    const rows = createLinearIssues();
    const result = bulkUpdateLinearIssues(rows, { ids: ['ENG-101'], status: 'in_progress', assignee: '沈亦舟' });
    expect(result.ok).toBe(true);
    const row = rows.find((r) => r.id === 'ENG-101')!;
    expect(row.status).toBe('in_progress');
    expect(row.assignee).toEqual({ name: '沈亦舟', initials: '沈' });
  });

  it('skips unmatched ids, applies the valid subset, and fails when nothing matches', () => {
    const rows = createLinearIssues();
    const partial = bulkUpdateLinearIssues(rows, {
      ids: ['ENG-101', 'ENG-9999'],
      patch: { status: 'done' },
    });
    expect(partial).toEqual({ ok: true, updated: 1 });
    expect(rows.find((r) => r.id === 'ENG-101')!.status).toBe('done');

    const miss = bulkUpdateLinearIssues(rows, { ids: ['ENG-9999'], patch: { status: 'done' } });
    expect(miss.ok).toBe(false);
  });

  it('rejects invalid patch values and empty id sets', () => {
    const rows = createLinearIssues();
    expect(bulkUpdateLinearIssues(rows, { ids: ['ENG-101'], patch: { status: 'nope' } }).ok).toBe(false);
    expect(bulkUpdateLinearIssues(rows, { ids: ['ENG-101'], patch: { assignee: '不存在' } }).ok).toBe(false);
    expect(bulkUpdateLinearIssues(rows, { ids: [], patch: { status: 'done' } }).ok).toBe(false);
  });

  it('session persistence: bulkUpdate results flow through the issues read endpoint', () => {
    const db = createLinearDatabase();
    bulkUpdateLinearIssues(db.issues, { ids: ['ENG-101', 'ENG-102'], patch: { status: 'done' } });
    const branch = createLinearFetcherBranch(db, <T,>(v: T): T => v);
    const res = branch({ url: '/r/Linear__issues?perPage=50', method: 'get', params: {}, body: {} }) as {
      status: number;
      data: { items: Array<{ id: string; status: string }> };
    };
    const first = res.data.items.find((i) => i.id === 'ENG-101')!;
    const second = res.data.items.find((i) => i.id === 'ENG-102')!;
    expect(first.status).toBe('done');
    expect(second.status).toBe('done');
  });
});

describe('Linear write operations — createIssue (ln-create-miss)', () => {
  it('appends the next ENG- sequence record with defaults and observable fields', () => {
    const rows = createLinearIssues();
    expect(nextLinearIssueId(rows)).toBe('ENG-135');
    const result = createLinearIssueRecord(rows, { title: '新问题样本', status: 'in_progress' });
    expect(result.ok).toBe(true);
    expect(result.id).toBe('ENG-135');
    const created = rows.find((r) => r.id === 'ENG-135')!;
    expect(created.title).toBe('新问题样本');
    expect(created.status).toBe('in_progress');
    expect(created.priority).toBe('none');
    expect(created.assignee.name.length).toBeGreaterThan(0);
    expect(rows).toHaveLength(35);
  });

  it('fails without a title (blank/missing) and never mutates the session set', () => {
    const rows = createLinearIssues();
    expect(createLinearIssueRecord(rows, {}).ok).toBe(false);
    expect(createLinearIssueRecord(rows, { title: '   ' }).ok).toBe(false);
    expect(rows).toHaveLength(34);
  });

  it('session persistence: created issues are served by the issues endpoint and detail builder', () => {
    const db = createLinearDatabase();
    createLinearIssueRecord(db.issues, { title: '链路验证问题' });
    const branch = createLinearFetcherBranch(db, <T,>(v: T): T => v);
    const list = branch({ url: '/r/Linear__issues?page=4&perPage=10', method: 'get', params: {}, body: {} }) as {
      data: { items: Array<{ id: string; title: string }> };
    };
    expect(list.data.items.some((i) => i.id === 'ENG-135' && i.title === '链路验证问题')).toBe(true);
    const detail = branch({ url: '/r/Linear__issue?id=ENG-135', method: 'get', params: {}, body: {} }) as {
      data: { id: string; title: string };
    };
    expect(detail.data.title).toBe('链路验证问题');
  });
});

describe('Linear write operations — archiveIssue (ln-archive-miss)', () => {
  it('soft-archives matched ids and hides them from default list + board reads', () => {
    const rows = createLinearIssues();
    const result = archiveLinearIssues(rows, { ids: ['ENG-101', 'ENG-102'] });
    expect(result).toEqual({ ok: true, updated: 2 });
    expect(rows.filter((r) => r.archived).map((r) => r.id)).toEqual(['ENG-101', 'ENG-102']);
    const visible = filterLinearIssues(rows, {});
    expect(visible.some((r) => r.id === 'ENG-101')).toBe(false);
    const board = buildLinearBoardData(filterLinearIssues(rows, {}));
    const allCardIds = Object.values(board.board).flatMap((n) =>
      (n as { type: string; children: string[] }).type === 'column' ? (n as { children: string[] }).children : [],
    );
    expect(allCardIds).not.toContain('card-ENG-101');
  });

  it('fails on zero match and is idempotent-safe for already archived ids', () => {
    const rows = createLinearIssues();
    expect(archiveLinearIssues(rows, { ids: ['ENG-9999'] }).ok).toBe(false);
    expect(archiveLinearIssues(rows, { ids: [] }).ok).toBe(false);
    archiveLinearIssues(rows, { ids: ['ENG-101'] });
    expect(archiveLinearIssues(rows, { ids: ['ENG-101'] }).ok).toBe(false);
  });
});

describe('Linear write operations — moveCard (ln-move-miss)', () => {
  it('flips the status across columns tolerating card-/col- prefixes', () => {
    const rows = createLinearIssues();
    const result = moveLinearCard(rows, { id: 'card-ENG-101', toColumn: 'col-done' });
    expect(result).toEqual({ ok: true, id: 'ENG-101', updated: 1 });
    expect(rows.find((r) => r.id === 'ENG-101')!.status).toBe('done');
  });

  it('orders the card inside the target column when toIndex is provided', () => {
    const rows = createLinearIssues();
    moveLinearCard(rows, { id: 'ENG-101', toColumn: 'done', toIndex: 0 });
    const doneOrder = rows.filter((r) => r.status === 'done').map((r) => r.id);
    expect(doneOrder[0]).toBe('ENG-101');
  });

  it('fails on unknown column or unmatched card without mutating layout', () => {
    const rows = createLinearIssues();
    const before = rows.map((r) => `${r.id}:${r.status}`).join('|');
    expect(moveLinearCard(rows, { id: 'ENG-101', toColumn: 'nope' }).ok).toBe(false);
    expect(moveLinearCard(rows, { id: 'ENG-9999', toColumn: 'done' }).ok).toBe(false);
    expect(rows.map((r) => `${r.id}:${r.status}`).join('|')).toBe(before);
  });

  it('session persistence: moveCard is observable through the board view payload', () => {
    const db = createLinearDatabase();
    moveLinearCard(db.issues, { id: 'ENG-101', toColumn: 'done' });
    const branch = createLinearFetcherBranch(db, <T,>(v: T): T => v);
    const board = branch({ url: '/r/Linear__issues?view=board', method: 'get', params: {}, body: {} }) as {
      data: { board: Record<string, { type: string; children: string[] }> };
    };
    const doneColumn = board.data.board['col-done']!;
    expect(doneColumn.children).toContain('card-ENG-101');
    const todoColumn = board.data.board['col-todo']!;
    expect(todoColumn.children).not.toContain('card-ENG-101');
  });
});

describe('Linear write operations — inboxUpdate (ln-inbox-miss)', () => {
  it('marks matched notifications read; empty ids targets all (bulk carrier)', () => {
    const groups = createLinearInbox();
    const single = updateLinearInbox(groups, { ids: ['ntf-1'], op: 'read' });
    expect(single).toEqual({ ok: true, updated: 1 });
    expect(groups[0]!.items.find((i) => i.id === 'ntf-1')!.unread).toBe(false);

    const all = updateLinearInbox(groups, { ids: [], op: 'read' });
    expect(all.ok).toBe(true);
    expect(countLinearUnread(groups)).toBe(0);
  });

  it('archive op flags items so default inbox reads hide them', () => {
    const groups = createLinearInbox();
    const result = updateLinearInbox(groups, { ids: ['ntf-2'], op: 'archive' });
    expect(result).toEqual({ ok: true, updated: 1 });
    expect(groups[0]!.items.find((i) => i.id === 'ntf-2')!.archived).toBe(true);
  });

  it('fails on unknown op or zero match without flipping state', () => {
    const groups = createLinearInbox();
    expect(updateLinearInbox(groups, { ids: ['ntf-1'], op: 'nope' }).ok).toBe(false);
    expect(updateLinearInbox(groups, { ids: ['ntf-999'], op: 'read' }).ok).toBe(false);
    expect(groups[0]!.items.find((i) => i.id === 'ntf-1')!.unread).toBe(true);
  });

  it('session persistence: unreadCount and total drop through the inbox read endpoint', () => {
    const db = createLinearDatabase();
    updateLinearInbox(db.inbox, { ids: [], op: 'read' });
    updateLinearInbox(db.inbox, { ids: ['ntf-1'], op: 'archive' });
    const branch = createLinearFetcherBranch(db, <T,>(v: T): T => v);
    const inbox = branch({ url: '/r/Linear__inbox', method: 'get', params: {}, body: {} }) as {
      data: { unreadCount: number; total: number };
    };
    expect(inbox.data.unreadCount).toBe(0);
    expect(inbox.data.total).toBe(8);
  });
});

describe('Linear write operations — copyLink (ln-copy-noop) + env wiring', () => {
  it('copyLink is a get no-op that always succeeds and echoes the id', () => {
    const db = createLinearDatabase();
    const issuesBefore = db.issues.length;
    const branch = createLinearFetcherBranch(db, <T,>(v: T): T => v);
    const res = branch({ url: '/r/Linear__copyLink?id=ENG-105', method: 'get', params: {}, body: {} }) as {
      status: number;
      data: { ok: boolean; id: string; url: string };
    };
    expect(res.status).toBe(0);
    expect(res.data.ok).toBe(true);
    expect(res.data.id).toBe('ENG-105');
    expect(res.data.url).toContain('ENG-105');
    expect(db.issues).toHaveLength(issuesBefore);
  });

  it('all five write endpoints are reachable through the showcase fetcher with session state', async () => {
    const { env } = createShowcaseEnv();
    const post = (url: string, data: Record<string, unknown>) =>
      env.fetcher!<Record<string, unknown>>({ url, method: 'post', data: data as never }, fetchCtx);

    const bulk = await post('/r/Linear__bulkUpdate', { ids: ['ENG-101'], patch: { status: 'done' } });
    expect(bulk.status).toBe(0);

    const create = await post('/r/Linear__createIssue', { title: '环境链路问题' });
    expect(create.status).toBe(0);
    expect(create.data?.id).toBe('ENG-135');

    const move = await post('/r/Linear__moveCard', { id: 'card-ENG-102', toColumn: 'col-in_progress' });
    expect(move.status).toBe(0);

    const inbox = await post('/r/Linear__inboxUpdate', { ids: ['ntf-1'], op: 'read' });
    expect(inbox.status).toBe(0);

    const archive = await post('/r/Linear__archiveIssue', { ids: ['ENG-103'] });
    expect(archive.status).toBe(0);

    const copy = await env.fetcher!<Record<string, unknown>>({ url: '/r/Linear__copyLink?id=ENG-101', method: 'get' }, fetchCtx);
    expect(copy.status).toBe(0);

    const issues = await env.fetcher!<Record<string, unknown>>({ url: '/r/Linear__issues?perPage=50', method: 'get' }, fetchCtx);
    const items = (issues.data as { items: Array<{ id: string; status: string }> }).items;
    expect(items.find((i) => i.id === 'ENG-101')!.status).toBe('done');
    expect(items.some((i) => i.id === 'ENG-103')).toBe(false);
    expect(items.some((i) => i.id === 'ENG-135')).toBe(true);
  });
});

describe('Linear page registration', () => {
  it('registers the 6 linear-* pages in the app-replica category', () => {
    const entries = COMPLEX_PAGE_ENTRIES.filter((e) => e.id.startsWith('linear-'));
    expect(entries.map((e) => e.id)).toEqual([
      'linear-issues',
      'linear-board',
      'linear-inbox',
      'linear-detail',
      'linear-projects',
      'linear-settings',
    ]);
    for (const entry of entries) {
      expect(entry.category).toBe('app-replica');
      expect(entry.features.length).toBeGreaterThanOrEqual(4);
    }
    // data-driven pages must name their Linear__ endpoint; settings is a
    // zero-write static form page (no endpoint).
    const dataDriven = entries.filter((e) => e.id !== 'linear-settings');
    expect(dataDriven.every((e) => e.description.includes('Linear__'))).toBe(true);
    expect(entries.find((e) => e.id === 'linear-settings')!.description).toContain('静态');
  });
});
