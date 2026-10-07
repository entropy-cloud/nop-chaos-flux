// cron 解析（6/7 段方言，诊断码 design §4）。移植自 nop-entropy CronExpression（C2 扩展后），
// 静态 impossible 判定作用在物化集合与允许月集上（plan 539 M-2 裁决）。
import type {
  CronDiagnosticCode,
  DynamicDay,
  DynamicWeek,
  FieldItem,
  ParsedCron,
  ParsedField,
  ParseResult
} from './types';

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DOW_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_DYNAMIC = /^(L|LW|L-(\d+)|(\d{1,2})W)$/;
const WEEK_NTH = /^(\d{1,2})#(\d{1,2})$/;
const WEEK_LAST = /^(\d{1,2})L$/;
/** 月最大天数（2 月按闰年上界 29 计静态可行性） */
const MONTH_MAX_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function fieldFromItems(items: FieldItem[], min: number, max: number): ParsedField {
  const set = new Set<number>();
  for (const item of items) {
    if (item.kind === 'star') {
      for (let i = min; i < max; i++) set.add(i);
    } else if (item.kind === 'single') {
      set.add(item.v);
    } else if (item.kind === 'range') {
      for (let i = item.a; i <= item.b; i++) set.add(i);
    } else if (item.kind === 'step') {
      const hi = max - 1;
      for (let i = item.a ?? min; i <= hi; i += item.step) set.add(i);
    } else {
      for (let i = item.a; i <= item.b; i += item.step) set.add(i);
    }
  }
  const values = [...set].sort((a, b) => a - b);
  return { items, values, set };
}

function replaceOrdinals(value: string, names: string[], offset: number): string {
  return names.reduce((acc, name, i) => acc.split(name).join(String(i + offset)), value.toUpperCase());
}

/** 数值 token 解析（Java getRange 语义）：`*`/`a`/`a-b`；返回 items 或抛诊断码 */
function parseRangeToken(token: string, min: number, max: number): FieldItem[] {
  return token.split(',').map((part) => {
    if (part === '*') return { kind: 'star' } as FieldItem;
    if (part.includes('/')) {
      const [base, stepText] = part.split('/');
      const step = Number(stepText);
      if (!Number.isInteger(step)) throw 'badToken';
      if (step <= 0) throw 'stepInvalid';
      if (base.includes('-')) {
        const [a, b] = base.split('-').map(Number);
        checkBounds(a, b, min, max);
        return { kind: 'rangeStep', a, b, step } as FieldItem;
      }
      const a = base === '*' ? null : Number(base);
      if (a !== null) checkBounds(a, a, min, max);
      return { kind: 'step', a, step } as FieldItem;
    }
    if (part.includes('-')) {
      const [a, b] = part.split('-');
      const na = Number(a);
      const nb = Number(b);
      if (!Number.isInteger(na) || !Number.isInteger(nb)) throw 'badToken';
      checkBounds(na, nb, min, max);
      return { kind: 'range', a: na, b: nb } as FieldItem;
    }
    const v = Number(part);
    if (!Number.isInteger(v)) throw 'badToken';
    checkBounds(v, v, min, max);
    return { kind: 'single', v } as FieldItem;
  });
}

function checkBounds(a: number, b: number, min: number, max: number): void {
  if (a >= max || b >= max) throw 'outOfRange';
  if (a < min || b < min) throw 'outOfRange';
  if (a > b) throw 'invertedRange';
}

function rejectDynamicChars(token: string): void {
  if (/[LW#]/.test(token) || token.startsWith('@')) throw 'unsupportedToken';
}

function rejectQuestionMark(token: string): void {
  if (token.includes('?')) throw 'questionMark';
}

/** 日位物化集合的静态 impossible 判定（允许月集上的最小日 > 最大可 feas 日） */
function checkStaticImpossible(days: ParsedField, monthValues: number[], dynamicDay: DynamicDay | null): void {
  if (dynamicDay) {
    if (dynamicDay.kind === 'last' && dynamicDay.off >= 31) throw 'impossible';
    if (dynamicDay.kind === 'last' && dynamicDay.off >= 29 && monthValues.length === 1 && monthValues[0] === 1) {
      throw 'impossible';
    }
    return;
  }
  if (days.values.length === 0) return;
  const minDay = days.values[0];
  const maxFeasible = Math.max(...monthValues.map((mo) => MONTH_MAX_DAYS[mo]));
  if (minDay > maxFeasible) throw 'impossible';
}

export function parseCron(expression: string): ParseResult {
  try {
    return { ok: true, value: doParse(expression) };
  } catch (code) {
    // 内部以诊断码字符串为控制流：catch 处收敛为类型化诊断 Result（结构化失败路径）
    const diagnostic = code as CronDiagnosticCode;
    return { ok: false, code: diagnostic };
  }
}

function doParse(expression: string): ParsedCron {
  const trimmed = expression.trim();
  // `@` 别名（@daily 等）按 unsupportedToken 识别，优先于段数预检（向量 DG-019）
  if (trimmed.startsWith('@')) throw 'unsupportedToken';
  const fields = trimmed.split(/\s+/);
  if (trimmed === '' || (fields.length !== 6 && fields.length !== 7)) throw 'fieldCount';

  rejectDynamicChars(fields[0]);
  rejectQuestionMark(fields[0]);
  const seconds = fieldFromItems(parseRangeToken(fields[0], 0, 60), 0, 60);
  rejectDynamicChars(fields[1]);
  rejectQuestionMark(fields[1]);
  const minutes = fieldFromItems(parseRangeToken(fields[1], 0, 60), 0, 60);
  rejectDynamicChars(fields[2]);
  rejectQuestionMark(fields[2]);
  const hours = fieldFromItems(parseRangeToken(fields[2], 0, 24), 0, 24);

  // 日位：? 等价 *；L/L-n/nW/LW 单 token 动态；数值路径 min=1（日位 0 拒绝）
  const dynamicDay = parseDynamicDay(fields[3]);
  const daysOfMonth = dynamicDay
    ? { items: [], values: [], set: new Set<number>() }
    : fieldFromItems(parseRangeToken(fields[3] === '?' ? '*' : fields[3], 1, 32), 1, 32);

  // 月位：名字 → 数字（保持 1-12 items，内部 0-11 集合）
  rejectQuestionMark(fields[4]);
  rejectDynamicChars(fields[4]);
  const monthItems = parseRangeToken(replaceOrdinals(fields[4], MONTH_NAMES, 1), 1, 13);
  const months = fieldFromItems(monthItems, 1, 13);
  const monthValues = months.values.map((m) => m - 1).sort((a, b) => a - b);

  // 周位：名字 → 数字（0-7，7→0）；L 单独 / d#N / dL 单 token 动态（名字替换先于动态匹配，Java 同序）
  const dowToken = replaceOrdinals(fields[5], DOW_NAMES, 0);
  const dynamicWeek = parseDynamicWeek(dowToken);
  const daysOfWeek = dynamicWeek
    ? { items: [], values: [], set: new Set<number>() }
    : normalizeDow(fieldFromItems(parseRangeToken(fields[5] === '?' ? '*' : dowToken, 0, 8), 0, 8));

  // 年位（可选第 7 段）：1970-2099
  let years: number[] | null = null;
  if (fields.length === 7) {
    rejectQuestionMark(fields[6]);
    rejectDynamicChars(fields[6]);
    years = fieldFromItems(parseRangeToken(fields[6], 1970, 2100), 1970, 2100).values;
  }

  checkStaticImpossible(daysOfMonth, monthValues, dynamicDay);

  return { seconds, minutes, hours, daysOfMonth, months, monthValues, daysOfWeek, dynamicDay, dynamicWeek, years };
}

function normalizeDow(field: ParsedField): ParsedField {
  if (!field.set.has(7)) return field;
  const set = new Set<number>();
  for (const v of field.values) set.add(v === 7 ? 0 : v);
  return { items: field.items, values: [...set].sort((a, b) => a - b), set };
}

function parseDynamicDay(token: string): DynamicDay | null {
  const m = DAY_DYNAMIC.exec(token);
  if (!m) {
    // 含 L/W/# 但不合动态语法的日位 token → unsupportedToken（如 1#2、15-20W），非 badToken
    if (/[LW#]/.test(token)) throw 'unsupportedToken';
    return null;
  }
  if (m[1] === 'L') return { kind: 'last', off: 0 };
  if (m[1] === 'LW') return { kind: 'lastWeekday' };
  if (m[2] !== undefined) return { kind: 'last', off: Number(m[2]) };
  const n = Number(m[3]);
  if (n < 1 || n > 31) throw 'outOfRange';
  return { kind: 'nearestWeekday', n };
}

function parseDynamicWeek(token: string): DynamicWeek | null {
  if (token === 'L') return { kind: 'lastWeek' };
  const nth = WEEK_NTH.exec(token);
  if (nth) {
    const d = Number(nth[1]);
    const n = Number(nth[2]);
    if (d < 0 || d > 7) throw 'outOfRange';
    if (n < 1 || n > 5) throw 'impossible';
    return { kind: 'nth', dow: d === 7 ? 0 : d, n };
  }
  const last = WEEK_LAST.exec(token);
  if (last) {
    const d = Number(last[1]);
    if (d < 0 || d > 7) throw 'outOfRange';
    return { kind: 'lastDow', dow: d === 7 ? 0 : d };
  }
  return null;
}
