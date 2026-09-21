import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * V12f plan 488 Phase 4 (playground schema wave) — schema data-flow pins.
 * Behavioral checks where jsdom allows; source assertions for chains that need
 * a real browser (same split as sundial-v12e-family6-dataflow.test.ts).
 */

function schemaSource(name: string): string {
  return readFileSync(`src/complex-pages/page-schemas/${name}`, 'utf8');
}

describe('V12f P4 — workbench search / counts / rows (G7-R2-视角11-07, G7-R3-视角11-01, ⑦ residual)', () => {
  it('sidebar and pressure-card counts bind to the todos/pressure sources', () => {
    const src = schemaSource('sundial-workbench.json');
    expect(src).toContain('"text": "${todosAll?.total ?? 0}"');
    expect(src).toContain('"text": "${todosToday?.total ?? 0}"');
    expect(src).toContain('"text": "${todosScheduled?.total ?? 0}"');
    expect(src).toContain('"text": "${todosDone?.total ?? 0}"');
    expect(src).toContain('"text": "${pressure?.count_overdue ?? 0}"');
    expect(src).toContain('"text": "${pressure?.count_today ?? 0}"');
    expect(src).toContain('"text": "${pressure?.count_future ?? 0}"');
    expect(src).toContain('"text": "${pressure?.count_none ?? 0}"');
    expect(src).toContain('"text": "${pressure?.total ?? 0}"');
    expect(src).toContain('/r/Sundial__todos?view=all');
    expect(src).toContain('/r/Sundial__todos?view=today');
    expect(src).toContain('/r/Sundial__todos?view=scheduled');
    expect(src).toContain('/r/Sundial__pressure');
  });

  it('the sidebar search input feeds the board row visibility filters', () => {
    const src = schemaSource('sundial-workbench.json');
    // every default-board task row is hidden unless it matches the search text;
    // scoped to row `visible` props — the four section `count` expressions reuse
    // the same predicate to keep the badge equal to the visible row count.
    const filterHits = src.match(/"visible": "\$\{ ISEMPTY\(search \?\? ''\) \|\| CONTAINS\(/g) ?? [];
    expect(filterHits.length).toBe(7);
  });

  it('move-to-list preselects the active task list instead of a hard-coded work (G7-R4-视角6-01)', () => {
    const schema = JSON.parse(schemaSource('sundial-workbench.json')) as object;
    const moveForm = (function find(node: unknown): { data?: Record<string, string> } | null {
      if (Array.isArray(node)) {
        for (const n of node) {
          const r = find(n);
          if (r) return r;
        }
      } else if (node && typeof node === 'object') {
        const rec = node as Record<string, unknown>;
        if (rec['id'] === 'sundial-taskdetail-move-form') return rec as { data?: Record<string, string> };
        for (const v of Object.values(rec)) {
          const r = find(v);
          if (r) return r;
        }
      }
      return null;
    })(schema);
    expect(moveForm?.data?.list).toBe("${taskDetail?.list ?? 'work'}");
  });
});

describe('V12f P4 — detail page (G7-视角11-14, G7-R2-视角11-04, G7-视角10-07)', () => {
  it('subtask add input has a real submit path through the mock channel', () => {
    const src = schemaSource('sundial-detail.json');
    expect(src).toContain('/r/Sundial__addSubtask');
    expect(src).toContain('sundial-detail-subtask-add-submit');
    expect(src).toContain('"path": "subtasksRev"');
    expect(src).toContain('/r/Sundial__subtasks');
  });

  it('subtask dialog title follows the active subtask record (no wrong-task mapping)', () => {
    const src = schemaSource('sundial-detail.json');
    expect(src).toContain('ARRAYFIND(subtasksAll?.items ?? [], st => st?.id === activeSubtask)?.title');
    expect(src).not.toContain('整理发票');
  });

  it('destructive ops declare confirm prompts (G7-视角10-07)', () => {
    const detail = schemaSource('sundial-detail.json');
    // 3 row-level deletes + the subtask-dialog delete
    expect((detail.match(/"confirmText": "确认删除该子任务？"/g) ?? []).length).toBe(4);
    expect(detail).toContain('"confirmText": "确认移到垃圾箱？"');
    const workbench = schemaSource('sundial-workbench.json');
    expect(workbench).toContain('"confirmText": "确认移到垃圾箱？"');
  });

  it('list field row has a single bound label + bound color dot (G7-R2-视角11-05)', () => {
    const src = schemaSource('sundial-detail.json');
    expect(src).toContain("sd-list-dot-blue' : ");
    expect(src).toContain("${ list === 'work' ? '工作' : list === 'family' ? '家庭' : '收件箱' }");
  });
});

describe('V12f P4 — settings (G7-视角4-10, G7-视角6-11, G7-视角11-12)', () => {
  it('save posts the connection inputs together with the mode', () => {
    const schema = JSON.parse(schemaSource('sundial-settings.json')) as object;
    const saveButton = (function find(node: unknown): { onClick?: Array<{ args?: { includeScope?: string[] } }> } | null {
      if (Array.isArray(node)) {
        for (const n of node) {
          const r = find(n);
          if (r) return r;
        }
      } else if (node && typeof node === 'object') {
        const rec = node as Record<string, unknown>;
        if (rec['testid'] === 'sundial-settings-save') return rec as { onClick?: Array<{ args?: { includeScope?: string[] } }> };
        for (const v of Object.values(rec)) {
          const r = find(v);
          if (r) return r;
        }
      }
      return null;
    })(schema);
    expect(saveButton?.onClick?.[0]?.args?.includeScope).toEqual(['mode', 'supabase-url', 'supabase-key']);
  });

  it('anon key uses a real password reveal toggle instead of a dead eye icon', () => {
    const src = schemaSource('sundial-settings.json');
    expect(src).toContain('"type": "input-password"');
    expect(src).toContain('"revealPassword": true');
    const deadEye = src.match(/"icon": "eye"/);
    expect(deadEye).toBeNull();
  });

  it('sync status card follows the sync mode (G7-视角11-12)', () => {
    const src = schemaSource('sundial-settings.json');
    expect((src.match(/"sundial-status-card"/g) ?? []).length).toBe(2);
    expect(src).toContain('"visible": "${mode === \'supabase\'}"');
    expect(src).toContain('"visible": "${mode !== \'supabase\'}"');
    expect(src).toContain("${ mode === 'local' ? '本地模式：不适用' : '刚刚' }");
  });
});

describe('V12f P4 — cross-page contracts', () => {
  it('row delete buttons unify on destructive + 确认 wording (G7-视角10-08)', () => {
    const src = schemaSource('master-detail.json');
    expect(src).toContain('"variant": "destructive"');
    expect(src).toContain('"confirmText": "确认删除该明细？"');
    expect(src).not.toContain('确定删除该明细');
  });

  it('master-detail 新增明细 is gated on a selected order (G7-R2-视角11-03)', () => {
    const src = schemaSource('master-detail.json');
    expect(src).toContain('"disabled": "${!mdFilter?.orderId}"');
  });

  it('advanced-query date-range is clearable (G7-R3-视角4-01)', () => {
    const schema = JSON.parse(schemaSource('advanced-query.json')) as {
      body: Array<{ queryForm?: { body: Array<{ name: string; clearable?: boolean }> } }>;
    };
    const queryForm = schema.body[0]?.queryForm;
    const dateRange = queryForm?.body.find((f) => f.name === 'dateRange');
    expect(dateRange?.clearable).toBe(true);
  });

  it('workbench 列表 nav and 列表 field rows use an existing lucide icon (G7-视角1-02)', () => {
    for (const name of ['sundial-workbench.json', 'sundial-detail.json', 'sundial-todo-dialog.json', 'sundial-settings.json']) {
      expect(schemaSource(name)).not.toContain('"icon": "tray"');
    }
    expect(schemaSource('sundial-settings.json')).toContain('"icon": "database"');
  });
});

describe('V12f P4 — mock channel (G7-视角11-14, G7-R3-视角11-01)', () => {
  it('pressure endpoint derives buckets from the task DB and addSubtask persists', async () => {
    const { createSundialFetcherBranch } = await import('../shared/mock-backend-sundial-branch');
    const { createMockDatabase } = await import('../shared/mock-backend');
    const db = createMockDatabase();
    const handler = createSundialFetcherBranch(db, (v) => structuredClone(v));

    const pressure = handler<{ count_overdue: number; count_today: number; count_future: number; count_none: number; total: number }>({
      url: '/r/Sundial__pressure',
      method: 'get',
      params: {},
      body: {},
    });
    expect(pressure?.status).toBe(0);
    // seeded DB: overdue 1, today 3, future 2, none 1 (active only)
    expect(pressure?.data.count_overdue).toBe(1);
    expect(pressure?.data.count_today).toBe(3);
    expect(pressure?.data.count_future).toBe(2);
    expect(pressure?.data.count_none).toBe(1);
    expect(pressure?.data.total).toBe(7);

    const before = handler<{ items: Array<{ id: number }>; total: number }>({
      url: '/r/Sundial__subtasks',
      method: 'get',
      params: {},
      body: {},
    });
    expect(before?.data.total).toBe(3);

    const added = handler<{ ok: boolean; subtask: { id: number; title: string } }>({
      url: '/r/Sundial__addSubtask',
      method: 'post',
      params: {},
      body: { taskId: 1, title: 'V12f 子任务' },
    });
    expect(added?.status).toBe(0);
    expect(added?.data.ok).toBe(true);

    const rejected = handler<{ status: number }>({
      url: '/r/Sundial__addSubtask',
      method: 'post',
      params: {},
      body: { taskId: 1, title: '   ' },
    });
    expect(rejected?.status).toBe(1);

    const after = handler<{ items: Array<{ id: number }>; total: number }>({
      url: '/r/Sundial__subtasks',
      method: 'get',
      params: {},
      body: {},
    });
    expect(after?.data.total).toBe(4);
    expect(after?.data.items.map((st) => st.id)).toContain(4);
  });
});
