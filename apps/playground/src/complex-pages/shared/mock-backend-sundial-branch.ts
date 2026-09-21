import {
  deleteSundialSubtask, filterSundialTasks, updateSundialTask,
  type MockDatabase, type SundialSettings, type SundialTask,
  type SundialTaskView,
} from './mock-backend';

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value !== '' && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}

export function createSundialFetcherBranch(db: MockDatabase, cloneFn: <T>(value: T) => T) {
  const clone = cloneFn;
  function handleSundialBranch<T>(input: { url: string; method: string; params: Record<string, unknown>; body: Record<string, unknown> }): { status: number; data: T } | null {
    const { url, method, params, body } = input;
    if (!url.includes('/r/Sundial__')) {
      return null;
    }
    // ----- Sundial replica endpoints (see docs/analysis/sundial-ui-reproduction-analysis.md) -----
    if (url.includes('/r/Sundial__summary') && method === 'get') {
      return {
        status: 0,
        data: clone({
          todayCompleted: 6,
          streakDays: 4,
          weekEnergy: 32,
          completionRate: '68%',
          encouragement: '今天已经推进 6 件，连续 4 天有完成记录。节奏正在形成。',
        }) as T,
      };
    }
    if (url.includes('/r/Sundial__trend') && method === 'get') {
      return {
        status: 0,
        data: clone({
          items: [
            { label: '8/10', count: 3 },
            { label: '8/11', count: 5 },
            { label: '8/12', count: 2 },
            { label: '8/13', count: 7 },
            { label: '8/14', count: 4 },
            { label: '8/15', count: 6 },
            { label: '今天', count: 2 },
          ],
          total: 7,
        }) as T,
      };
    }
    if (url.includes('/r/Sundial__energy') && method === 'get') {
      return {
        status: 0,
        data: clone({
          items: [
            { label: '8/10', points: 4 },
            { label: '8/11', points: 9 },
            { label: '8/12', points: 3 },
            { label: '8/13', points: 12 },
            { label: '8/14', points: 6 },
            { label: '8/15', points: 10 },
            { label: '今天', points: 4 },
          ],
          total: 7,
        }) as T,
      };
    }
    if (url.includes('/r/Sundial__pressure') && method === 'get') {
      return {
        status: 0,
        data: clone({
          items: [
            { bucket: '逾期', count: 3, tone: '#d25151' },
            { bucket: '今天', count: 5, tone: '#ea7a2a' },
            { bucket: '未来 7 天', count: 4, tone: '#3c83f6' },
            { bucket: '无日期', count: 2, tone: '#636363' },
          ],
          count_overdue: 3,
          count_today: 5,
          count_future: 4,
          count_none: 2,
          total: 14,
        }) as T,
      };
    }
    if (url.includes('/r/Sundial__outputStructure') && method === 'get') {
      return {
        status: 0,
        data: clone({
          deepTasks: 2,
          quickWins: 8,
          flaggedDone: 1,
          outputSummary: '本周已经输出 32 点，继续保持节奏。',
        }) as T,
      };
    }
    if (url.includes('/r/Sundial__lists') && method === 'get') {
      return {
        status: 0,
        data: clone({
          items: [
            { name: '工作', color: 'blue', count: 6 },
            { name: '家庭', color: 'orange', count: 3 },
            { name: '购物', color: 'green', count: 4 },
            { name: '收件箱', color: 'neutral', count: 2 },
          ],
          total: 4,
        }) as T,
      };
    }
    if (url.includes('/r/Sundial__todos') && method === 'get') {
      const viewMatch = url.match(/[?&]view=([a-z]+)/);
      const viewRaw = viewMatch?.[1] ?? 'all';
      const view: SundialTaskView = (['all', 'today', 'scheduled', 'done', 'trash'] as const).includes(viewRaw as SundialTaskView)
        ? (viewRaw as SundialTaskView)
        : 'all';
      const items = filterSundialTasks(db.sundialTasks, view);
      return {
        status: 0,
        data: clone({ items, total: items.length, view }) as T,
      };
    }
    if (url.includes('/r/Sundial__updateTodoItem') && method === 'post') {
      const id = asNumber(body.id);
      if (id === undefined) {
        return { status: 1, data: clone({ ok: false, error: 'missing id' }) as T };
      }
      const { id: _ignored, ...patch } = body as Record<string, unknown>;
      const updated = updateSundialTask(db.sundialTasks, id, patch as Partial<SundialTask>);
      if (!updated) {
        return { status: 1, data: clone({ ok: false, error: 'task not found' }) as T };
      }
      return { status: 0, data: clone({ ok: true, task: { ...updated } }) as T };
    }
    if (url.includes('/r/Sundial__subtasks') && method === 'get') {
      const taskId = asNumber(body.taskId ?? params.taskId);
      const items = db.sundialSubtasks.filter((st) => st.taskId === taskId);
      return { status: 0, data: clone({ items, total: items.length }) as T };
    }
    if (url.includes('/r/Sundial__deleteSubtask') && method === 'post') {
      const id = asNumber(body.id);
      if (id === undefined) {
        return { status: 1, data: clone({ ok: false, error: 'missing id' }) as T };
      }
      const deleted = deleteSundialSubtask(db.sundialSubtasks, id);
      if (!deleted) {
        return { status: 1, data: clone({ ok: false, error: 'subtask not found' }) as T };
      }
      return { status: 0, data: clone({ ok: true, id }) as T };
    }
    if (url.includes('/r/Sundial__updateSettings') && method === 'post') {
      const mode = body.mode;
      const validModes: SundialSettings['mode'][] = ['local', 'supabase', 'selfhost'];
      if (typeof mode !== 'string' || !validModes.includes(mode as SundialSettings['mode'])) {
        return { status: 1, data: clone({ ok: false, error: 'invalid mode' }) as T };
      }
      db.sundialSettings.mode = mode as SundialSettings['mode'];
      db.sundialSettings.savedAt = '刚刚';
      return { status: 0, data: clone({ ok: true, ...db.sundialSettings }) as T };
    }
    // V12e 族6 (G7-视角11-03, plan 487): the workbench 添加 dialog persists
    // through the mock channel — a task lands in db.sundialTasks so the
    // /r/Sundial__todos views (counts bound via dependsOn revision) reflect it.
    if (url.includes('/r/Sundial__addTodoItem') && method === 'post') {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (title === '') {
        return { status: 1, data: clone({ ok: false, error: 'missing title' }) as T };
      }
      const nextId = db.sundialTasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;
      const task: SundialTask = {
        id: nextId,
        title,
        note: typeof body.note === 'string' ? body.note : '',
        done: false,
        trashed: false,
        dueLabel: '',
        dueTone: 'none',
        flagged: false,
        recur: 'none',
        list: 'inbox',
        subtasks: 0,
      };
      db.sundialTasks.push(task);
      return { status: 0, data: clone({ ok: true, task }) as T };
    }
    // V12e 族6 (G7-视角11-05, plan 487): the task-detail dialog binds its
    // title/note to the ACTIVE task instead of a static demo string.
    if (url.includes('/r/Sundial__todoDetail') && method === 'get') {
      const qs = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams();
      const id = asNumber(body.id ?? params.id ?? qs.get('id'));
      const task = db.sundialTasks.find((t) => t.id === id) ?? null;
      if (!task) {
        return { status: 1, data: clone({ ok: false, error: 'task not found' }) as T };
      }
      return { status: 0, data: clone(task) as T };
    }
    if (url.includes('/r/Sundial__todayTasks') && method === 'get') {
      return {
        status: 0,
        data: clone({
          items: [
            { time: '08:30', title: '晨间拉伸', past: true },
            { time: '10:00', title: '项目同步会', past: true },
            { time: '14:00', title: '写周报', past: false },
            { time: '17:30', title: '预约牙医', past: false },
          ],
          total: 4,
        }) as T,
      };
    }
    return null;
  }
  return handleSundialBranch;
}
