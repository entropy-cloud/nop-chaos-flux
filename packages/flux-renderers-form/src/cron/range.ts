// range 截断与全链路序列（count 纪元 = range.start ?? 1970-01-01，绝对语义不随 after 重置——向量 RG-04 判别）。
import { parseCron } from './parse';
import { nextRunAfter } from './next-run';
import { matchesRepeatAnchor, type RepeatSpec } from './repeat';
import type { CronScheduleValue } from './types';

// 枚举守卫：仅防病态输入死循环。已知边界：end-only range（countEpoch 回退 1970）配逐秒级 cron 时
// 枚举会被守卫截断且与正常终止不可区分——向量未覆盖、C5 预览窗口（limit ≤20 + 有 start 用法）不触发；
// 后继渲染器如需高频无 start 场景，应把枚举起点钳到 afterMs（C7 收口候选）。
const GUARD = 500000;

function dateBoundaryMs(date: string, endOfDay: boolean, tzOffsetMinutes: number): number {
  const [y, m, d] = date.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d, 0, 0, 0) - tzOffsetMinutes * 60000;
  return endOfDay ? base + 86400000 - 1 : base;
}

interface FireSequenceResult {
  fires: number[];
  /** stopsByLimit 时为最后一次 fire 后的下一命中（继续枚举的游标）；end/count/引擎终止时为 null */
  exhaustedAfter: number | null;
}

/**
 * 编辑器值的触发序列：自 countEpoch 绝对枚举，应用 repeat 过滤与 end/count 截断，
 * 收集 >= afterMs 的前 limit 次触发。零 IO 纯推导。
 */
export function fireSequence(
  value: CronScheduleValue,
  afterMs: number,
  limit: number,
  tzOffsetMinutes = 0
): FireSequenceResult {
  const parsed = parseCron(value.cron);
  if (!parsed.ok) return { fires: [], exhaustedAfter: null };

  const repeat: RepeatSpec | null = value.repeat ?? null;
  const anchor = repeat ? repeat.anchor ?? value.range?.start ?? null : null;
  const startMs = value.range?.start ? dateBoundaryMs(value.range.start, false, tzOffsetMinutes) : null;
  const endMs = value.range?.end ? dateBoundaryMs(value.range.end, true, tzOffsetMinutes) : null;
  const count = value.range?.count ?? null;
  // count 纪元：计数窗口自 range.start 起算，start 缺省回退引擎纪元 1970-01-01T00:00Z
  const countEpoch = startMs ?? dateBoundaryMs('1970-01-01', false, tzOffsetMinutes);

  const fires: number[] = [];
  let fired = 0;
  let prev = countEpoch - 1;
  let guard = 0;
  let stoppedByLimit = false;
  while (guard++ < GUARD) {
    const t = nextRunAfter(parsed.value, prev, tzOffsetMinutes);
    if (t === null) break;
    if (endMs !== null && t >= endMs) break;
    if (!repeat || matchesRepeatAnchor(t, repeat, anchor, tzOffsetMinutes)) {
      if (count !== null && fired >= count) break;
      fired++;
      if (t >= afterMs) {
        fires.push(t);
        if (fires.length >= limit) {
          stoppedByLimit = true;
          break;
        }
      }
    }
    prev = t;
  }

  if (!stoppedByLimit) return { fires, exhaustedAfter: null };

  // limit 停止：给出继续枚举的下一命中（供调用方判定序列是否延续）
  let p = fires[fires.length - 1];
  let g = 0;
  while (g++ < GUARD) {
    const nx = nextRunAfter(parsed.value, p, tzOffsetMinutes);
    if (nx === null) return { fires, exhaustedAfter: null };
    if (endMs !== null && nx >= endMs) return { fires, exhaustedAfter: null };
    if (!repeat || matchesRepeatAnchor(nx, repeat, anchor, tzOffsetMinutes)) {
      if (count !== null && fired >= count) return { fires, exhaustedAfter: null };
      return { fires, exhaustedAfter: nx };
    }
    p = nx;
  }
  return { fires, exhaustedAfter: null };
}
