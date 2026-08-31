/**
 * Sundial replica mock data + helpers (extracted from mock-backend.ts to keep
 * it under the 500-line governance limit — see docs/plans/460 B8).
 */
export interface SundialTask {
  id: number;
  title: string;
  note: string;
  done: boolean;
  trashed: boolean;
  dueLabel: string;
  dueTone: 'overdue' | 'today' | 'future' | 'none';
  flagged: boolean;
  recur: 'none' | 'daily' | 'weekly' | 'monthly';
  list: 'inbox' | 'work' | 'family' | 'shopping';
  subtasks: number;
}

export interface SundialSubtask {
  id: number;
  taskId: number;
  title: string;
  done: boolean;
}

export type SundialTaskView = 'all' | 'today' | 'scheduled' | 'done' | 'trash';

export interface SundialSettings {
  mode: 'local' | 'supabase' | 'selfhost';
  savedAt: string;
}

export function createSundialTasks(): SundialTask[] {
  return [
    { id: 1, title: '整理季度报税材料', note: '发票 + 银行流水', done: false, trashed: false, dueLabel: '昨天', dueTone: 'overdue', flagged: true, recur: 'none', list: 'work', subtasks: 2 },
    { id: 2, title: '给项目经理回电话', note: '讨论上线时间', done: false, trashed: false, dueLabel: '今天', dueTone: 'today', flagged: false, recur: 'weekly', list: 'work', subtasks: 0 },
    { id: 3, title: '预约牙医检查', note: '', done: false, trashed: false, dueLabel: '8/18', dueTone: 'future', flagged: false, recur: 'none', list: 'family', subtasks: 0 },
    { id: 4, title: '读完《设计中的设计》', note: '还剩两章', done: false, trashed: false, dueLabel: '', dueTone: 'none', flagged: true, recur: 'none', list: 'inbox', subtasks: 0 },
    { id: 5, title: '整理收件箱里的票据', note: '', done: false, trashed: false, dueLabel: '今天', dueTone: 'today', flagged: false, recur: 'daily', list: 'inbox', subtasks: 0 },
    { id: 6, title: '撰写周报', note: '数据部分已完成', done: false, trashed: false, dueLabel: '8/19', dueTone: 'future', flagged: false, recur: 'weekly', list: 'work', subtasks: 1 },
    { id: 7, title: '更新团队共享日历', note: '', done: true, trashed: false, dueLabel: '今天', dueTone: 'today', flagged: false, recur: 'none', list: 'work', subtasks: 0 },
    { id: 8, title: '采购办公耗材', note: 'A4 纸 + 笔芯', done: true, trashed: false, dueLabel: '昨天', dueTone: 'overdue', flagged: false, recur: 'monthly', list: 'shopping', subtasks: 0 },
    { id: 9, title: '回复客户邮件', note: '已转给产品同事', done: false, trashed: true, dueLabel: '8/10', dueTone: 'overdue', flagged: false, recur: 'none', list: 'inbox', subtasks: 0 },
    { id: 10, title: '和家人看展览', note: '已约周日', done: false, trashed: false, dueLabel: '今天', dueTone: 'today', flagged: false, recur: 'none', list: 'family', subtasks: 0 },
  ];
}

export function createSundialSubtasks(): SundialSubtask[] {
  return [
    { id: 1, taskId: 1, title: '收集销售数据', done: true },
    { id: 2, taskId: 1, title: '整理发票', done: false },
    { id: 3, taskId: 6, title: '撰写结论部分', done: false },
  ];
}

export function createSundialSettings(): SundialSettings {
  return { mode: 'local', savedAt: '从未' };
}

const SUNDIAL_VIEW_MAP: Record<SundialTaskView, (t: SundialTask) => boolean> = {
  all: (t) => !t.trashed,
  today: (t) => !t.trashed && !t.done && t.dueTone === 'today',
  scheduled: (t) => !t.trashed && !t.done && (t.dueTone === 'overdue' || t.dueTone === 'future'),
  done: (t) => !t.trashed && t.done,
  trash: (t) => t.trashed,
};

export function filterSundialTasks(tasks: SundialTask[], view: SundialTaskView): SundialTask[] {
  const filter = SUNDIAL_VIEW_MAP[view];
  return filter ? tasks.filter(filter) : tasks.filter((t) => !t.trashed);
}

export function updateSundialTask(tasks: SundialTask[], id: number, patch: Partial<SundialTask>): SundialTask | null {
  const target = tasks.find((t) => t.id === id);
  if (!target) {
    return null;
  }
  Object.assign(target, patch);
  return target;
}

export function deleteSundialSubtask(subtasks: SundialSubtask[], id: number): boolean {
  const index = subtasks.findIndex((s) => s.id === id);
  if (index === -1) {
    return false;
  }
  subtasks.splice(index, 1);
  return true;
}
