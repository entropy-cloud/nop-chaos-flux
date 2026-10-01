import { describe, expect, it } from 'vitest';
import { calculateCriticalPath } from './cpm.js';
import type { GanttTask, GanttLink, GanttId } from './gantt.types.js';

// plan 481 Phase 1 Proof: CPM 纯函数单测先红——
// 拓扑排序、正向最早/反向最晚、浮动为零集、环输入安全终止、空 links 边界。
// 全部期望集为手算结果（见各用例注释）。

function makeTasks(rows: Array<{ id: string; duration?: number; type?: 'task' | 'project' | 'milestone'; start?: string; end?: string }>): Map<GanttId, GanttTask> {
  const map = new Map<GanttId, GanttTask>();
  for (const row of rows) {
    map.set(row.id, {
      id: row.id,
      text: row.id,
      type: row.type ?? 'task',
      start: row.start ?? '2026-01-01',
      end: row.end ?? '2026-01-02',
      duration: row.duration,
      $x: 0, $y: 0, $w: 0, $h: 0, $level: 0, $branchSize: 0, $posInBranch: 0,
      $source: [], $target: [],
    } as GanttTask);
  }
  return map;
}

function makeLinks(rows: Array<[string, string, GanttLink['type']]>): Map<GanttId, GanttLink> {
  const map = new Map<GanttId, GanttLink>();
  rows.forEach(([source, target, type], i) => {
    map.set(`l${i}`, { id: `l${i}`, source, target, type, $p: '' });
  });
  return map;
}

describe('calculateCriticalPath (plan 481 A1)', () => {
  it('linear FS chain — every task float 0, all critical', () => {
    // T1(3d) -FS-> T2(2d) -FS-> T3(1d): ES=0/3/5, float 全 0 → 关键集 {T1,T2,T3}
    const tasks = makeTasks([
      { id: 'T1', duration: 3 },
      { id: 'T2', duration: 2 },
      { id: 'T3', duration: 1 },
    ]);
    const links = makeLinks([
      ['T1', 'T2', 'finish_to_start'],
      ['T2', 'T3', 'finish_to_start'],
    ]);
    expect(calculateCriticalPath(tasks, links).sort()).toEqual(['T1', 'T2', 'T3']);
  });

  it('branch with float — only zero-float path is critical (hand-computed)', () => {
    // T1(1d)→T2(5d)→T4(2d); T1→T3(1d)→T4 (全 FS)
    // 正向: ES1=0 EF1=1; ES2=1 EF2=6; ES3=1 EF3=2; ES4=6 EF4=8; maxEF=8
    // 反向: LS4=6 float0; LS2=6-5=1 float0; LS3=6-1=5 float4; LS1=min(1-1,5-1)=0 float0
    // 关键集 = {T1,T2,T4}（T3 有 4 天浮动，不入集）
    const tasks = makeTasks([
      { id: 'T1', duration: 1 },
      { id: 'T2', duration: 5 },
      { id: 'T3', duration: 1 },
      { id: 'T4', duration: 2 },
    ]);
    const links = makeLinks([
      ['T1', 'T2', 'finish_to_start'],
      ['T1', 'T3', 'finish_to_start'],
      ['T2', 'T4', 'finish_to_start'],
      ['T3', 'T4', 'finish_to_start'],
    ]);
    expect(calculateCriticalPath(tasks, links).sort()).toEqual(['T1', 'T2', 'T4']);
  });

  it('cycle input terminates safely — cycle members stay out of the set (Failure Paths cpm-cycle-input)', () => {
    // T1→T2→T1 成环；T3 独立。环上任务不入关键集、不抛错；T3 正常参与。
    const tasks = makeTasks([
      { id: 'T1', duration: 2 },
      { id: 'T2', duration: 2 },
      { id: 'T3', duration: 3 },
    ]);
    const links = makeLinks([
      ['T1', 'T2', 'finish_to_start'],
      ['T2', 'T1', 'finish_to_start'],
    ]);
    const result = calculateCriticalPath(tasks, links);
    expect(result).toEqual(['T3']);
  });

  it('empty links — empty set, no highlight (Failure Paths cpm-empty-links)', () => {
    const tasks = makeTasks([
      { id: 'T1', duration: 3 },
      { id: 'T2', duration: 5 },
    ]);
    expect(calculateCriticalPath(tasks, new Map())).toEqual([]);
    expect(calculateCriticalPath(new Map(), new Map())).toEqual([]);
  });

  it('single task with no links — empty set (Failure Paths cpm-empty-links)', () => {
    const tasks = makeTasks([{ id: 'T1', duration: 4 }]);
    expect(calculateCriticalPath(tasks, new Map())).toEqual([]);
  });

  it('dangling link endpoints are ignored; links referencing missing tasks do not crash', () => {
    const tasks = makeTasks([
      { id: 'T1', duration: 2 },
      { id: 'T2', duration: 2 },
    ]);
    const links = makeLinks([
      ['T1', 'T2', 'finish_to_start'],
      ['T1', 'ghost', 'finish_to_start'],
      ['ghost', 'T2', 'finish_to_start'],
    ]);
    // 有效边 T1→T2 成链 → 全关键
    expect(calculateCriticalPath(tasks, links).sort()).toEqual(['T1', 'T2']);
  });

  it('SS link type constrains starts — hand-computed zero-float chain', () => {
    // T1(2d) -SS-> T2(3d): ES2 = ES1 + 0 = 0; EF2=3=maxEF → LS2=0 float0;
    // LS1 = LS2 - 0 = 0 float0 → {T1,T2}
    const tasks = makeTasks([
      { id: 'T1', duration: 2 },
      { id: 'T2', duration: 3 },
    ]);
    const links = makeLinks([['T1', 'T2', 'start_to_start']]);
    expect(calculateCriticalPath(tasks, links).sort()).toEqual(['T1', 'T2']);
  });

  it('FF link type gives the predecessor float (hand-computed)', () => {
    // T1(2d) -FF-> T2(3d): T2 不受正向约束（ES2=0, EF2=3=maxEF, float0）；
    // T1 只需在 T2 结束前结束（EF1=2 ≤ EF2=3）→ 1 天浮动 → 仅 {T2} 关键
    const tasks = makeTasks([
      { id: 'T1', duration: 2 },
      { id: 'T2', duration: 3 },
    ]);
    const links = makeLinks([['T1', 'T2', 'finish_to_finish']]);
    expect(calculateCriticalPath(tasks, links)).toEqual(['T2']);
  });

  it('milestone tasks have zero duration and can terminate a critical chain', () => {
    // T1(3d) -FS-> M(0d 里程碑): EF1=3=maxEF; LS_M=3 float0; LS1=3-3=0 float0 → 全关键
    const tasks = makeTasks([
      { id: 'T1', duration: 3 },
      { id: 'M', type: 'milestone', duration: 0 },
    ]);
    const links = makeLinks([['T1', 'M', 'finish_to_start']]);
    expect(calculateCriticalPath(tasks, links).sort()).toEqual(['M', 'T1']);
  });

  it('derives duration from start/end when duration field is absent', () => {
    // T1 2026-01-01→2026-01-04 = 3d -FS-> T2(1d)：链式全关键
    const tasks = makeTasks([
      { id: 'T1', start: '2026-01-01', end: '2026-01-04' },
      { id: 'T2', start: '2026-01-04', end: '2026-01-05' },
    ]);
    const links = makeLinks([['T1', 'T2', 'finish_to_start']]);
    expect(calculateCriticalPath(tasks, links).sort()).toEqual(['T1', 'T2']);
  });
});

describe('ux-r8 GT-2 demo 拓扑关键路径语义（critical 豁免 project 条带的语义保留证明）', () => {
  it('双项目 FS 链：唯一零浮动节点为后结束的 project 锚点（渲染豁免前即如此）', () => {
    // gantt-demo 拓扑同构：两个 project 各带 FS 子链，Beta project 结束最晚
    const tasks = makeTasks([
      { id: '1', type: 'project', start: '2026-10-01', end: '2026-10-20' },
      { id: '2', type: 'task', start: '2026-10-01', end: '2026-10-08' },
      { id: '3', type: 'task', start: '2026-10-09', end: '2026-10-20' },
      { id: '10', type: 'project', start: '2026-10-05', end: '2026-12-01' },
      { id: '11', type: 'task', start: '2026-10-05', end: '2026-10-20' },
      { id: '12', type: 'task', start: '2026-10-21', end: '2026-11-20' },
      { id: '13', type: 'task', start: '2026-11-21', end: '2026-12-01' },
    ]);
    const linkRows = [
      { id: 'l1', source: '2', target: '3', type: 'FS' },
      { id: 'l2', source: '11', target: '12', type: 'FS' },
      { id: 'l3', source: '12', target: '13', type: 'FS' },
    ];
    const links = new Map(linkRows.map((l) => [l.id, l as never]));
    const path = calculateCriticalPath(tasks, links);
    // 唯一零浮动 = Beta project（maxFinish 锚点）；子任务链有正浮动非 critical
    expect(path).toEqual(['10']);
  });
});
