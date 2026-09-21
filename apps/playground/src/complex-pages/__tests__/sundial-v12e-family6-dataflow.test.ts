import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createShowcaseEnv } from '../shared/showcase-env';

function schemaSource(name: string): string {
  return readFileSync(`src/complex-pages/page-schemas/${name}`, 'utf8');
}

type FetchLike = <T>(api: { url: string; method?: string; data?: unknown }) => Promise<{
  status: number;
  data: T;
}>;

function asFetch(fetcher: unknown): FetchLike {
  return fetcher as FetchLike;
}

describe('Sundial V12e 族6 — add/detail mock channel (write→read chain)', () => {
  it('addTodoItem persists into db and /r/Sundial__todos views see it', async () => {
    const { env } = createShowcaseEnv();
    const fetch = asFetch(env.fetcher);
    const before = await fetch<{ total: number }>({
      url: '/r/Sundial__todos?view=all',
      method: 'get',
    });
    const added = await fetch<{ ok: boolean; task: { id: number; title: string } }>({
      url: '/r/Sundial__addTodoItem',
      method: 'post',
      data: { title: 'V12e 数据流任务', note: '由添加对话框写入' },
    });
    expect(added.status).toBe(0);
    expect(added.data.ok).toBe(true);
    expect(added.data.task.title).toBe('V12e 数据流任务');

    const afterAll = await fetch<{ total: number }>({
      url: '/r/Sundial__todos?view=all',
      method: 'get',
    });
    expect(afterAll.data.total).toBe(before.data.total + 1);

    const trashed = await fetch<{ items: Array<{ id: number }>; total: number }>({
      url: '/r/Sundial__todos?view=trash',
      method: 'get',
    });
    expect(trashed.data.items.map((t) => t.id)).not.toContain(added.data.task.id);
  });

  it('addTodoItem rejects an empty title (dialog title is required)', async () => {
    const { env } = createShowcaseEnv();
    const fetch = asFetch(env.fetcher);
    const res = await fetch<{ status: number }>({
      url: '/r/Sundial__addTodoItem',
      method: 'post',
      data: { title: '   ' },
    });
    expect(res.status).toBe(1);
  });

  it('todoDetail returns the active task for the dialog title binding', async () => {
    const { env } = createShowcaseEnv();
    const fetch = asFetch(env.fetcher);
    const res = await fetch<{ id: number; title: string; note: string }>({
      url: '/r/Sundial__todoDetail?id=2',
      method: 'get',
    });
    expect(res.status).toBe(0);
    expect(res.data.id).toBe(2);
    expect(typeof res.data.title).toBe('string');
    const missing = await fetch<{ status: number }>({
      url: '/r/Sundial__todoDetail?id=999',
      method: 'get',
    });
    expect(missing.status).toBe(1);
  });
});

describe('Sundial V12e 族6 — schema data-flow assertions', () => {
  it('workbench binds completed/trash counts to the todos sources and bumps the revision on writes', () => {
    const src = schemaSource('sundial-workbench.json');
    expect(src).toContain('/r/Sundial__todos?view=done');
    expect(src).toContain('/r/Sundial__todos?view=trash');
    expect((src.match(/"dependsOn"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(src).toContain('sundialTodosRev');
    expect(src).toContain('共 ${todosDone?.total ?? 0} 条已完成任务');
    expect(src).toContain('${todosTrash?.total ?? 0} 条任务在垃圾箱里');
    // 添加 dialog persists instead of bare-closing (G7-视角11-03).
    expect(src).toContain('/r/Sundial__addTodoItem');
    // task-detail trash/move writes bump the revision so counts refresh.
    expect(src.split('"sundialTodosRev"').length - 1).toBeGreaterThanOrEqual(4);
  });

  it('task-detail dialog title/note read the active task source (G7-视角11-05)', () => {
    const src = schemaSource('sundial-workbench.json');
    expect(src).toContain('/r/Sundial__todoDetail?id=${activeTaskId ?? 1}');
    expect(src).toContain('${taskDetail?.title ?? ');
    expect(src).toContain('${taskDetail?.note ?? ');
  });

  it('sidebar lists/analytics sections navigate to their pages (G7-视角11-04)', () => {
    const src = schemaSource('sundial-workbench.json');
    expect(src).toContain('#/complex-pages/sundial-settings');
    expect(src).toContain('#/complex-pages/sundial-analytics');
  });

  it('detail 清除 writes the badge target and toasts conditionally (G7-视角11-13)', () => {
    const src = schemaSource('sundial-detail.json');
    expect(src).toContain('"path": "pickedDateTime"');
    expect(src).toContain('"path": "pickedDateLabel"');
    // the dead demo-date path is gone
    expect(src).not.toContain('"path": "demo-date"');
    expect(src).toContain("pickedDateTime ?? ''");
    expect(src).toContain('"when": ');
  });

  it('subtask-dialog delete flips the in-page row gate (G7-R5-视角11-01)', () => {
    const src = schemaSource('sundial-detail.json');
    expect(src).toContain('"when": "${activeSubtask === 1}"');
    expect(src).toContain('"when": "${activeSubtask === 2}"');
    expect(src).toContain('"when": "${activeSubtask === 3}"');
  });

  it('form-wizard carries deptId through the confirm echo and onComplete payload (G7-R2-视角11-02)', () => {
    const schema = JSON.parse(schemaSource('form-wizard.json')) as {
      body: Array<{ onComplete?: { args?: { data?: Record<string, string> } } }>;
    };
    const wizard = schema.body[0];
    const src = schemaSource('form-wizard.json');
    expect(src).toContain('部门 ID：');
    expect(src).toContain('部门 ID：');
    expect(src).toContain('${wizardData.step2.deptId ??');
    expect(wizard.onComplete?.args?.data?.deptId).toBe('${wizardData.step2.deptId}');
  });

  it('standalone todo-dialog 添加 persists through the same channel (G7-视角11-03)', () => {
    const src = schemaSource('sundial-todo-dialog.json');
    expect(src).toContain('/r/Sundial__addTodoItem');
    expect(src).toContain('"sundialTodosRev"');
  });
});
