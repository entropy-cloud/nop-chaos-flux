// cron 引擎类型（cron 轨道 C4，plan 539）。语义权威：黄金向量 meta.conventions +
// nop-entropy CronExpression（C2 扩展后）/ AnchorRepeatTrigger（C3）。TS 与 Java 不一致时以 Java 为准修 TS。

export type CronDiagnosticCode =
  | 'fieldCount'
  | 'badToken'
  | 'outOfRange'
  | 'invertedRange'
  | 'stepInvalid'
  | 'questionMark'
  | 'unsupportedToken'
  | 'impossible';

/** 编辑器值：cron 为本体，repeat/range 为 cron 表达不了的配套结构（design §4） */
export interface CronScheduleValue {
  cron: string;
  repeat?: { every: number; unit: 'day' | 'week'; anchor?: string };
  range?: { start?: string; end?: string; count?: number };
}

export type FieldItem =
  | { kind: 'star' }
  | { kind: 'single'; v: number }
  | { kind: 'range'; a: number; b: number }
  /** a=null 表示星号步进（`*&#47;n` 形）；a 为数字表示 `a/n`（b 取字段上界） */
  | { kind: 'step'; a: number | null; step: number }
  | { kind: 'rangeStep'; a: number; b: number; step: number };

export interface ParsedField {
  items: FieldItem[];
  /** 物化集合（升序），匹配用 */
  values: number[];
  set: Set<number>;
}

/** 日位动态描述符：L / L-n / nW / LW */
export type DynamicDay =
  | { kind: 'last'; off: number }
  | { kind: 'nearestWeekday'; n: number }
  | { kind: 'lastWeekday' };

/** 周位动态描述符：d#N / dL / 单独 L（=周六，Quartz 语义） */
export type DynamicWeek =
  | { kind: 'nth'; dow: number; n: number }
  | { kind: 'lastDow'; dow: number }
  | { kind: 'lastWeek' };

export interface ParsedCron {
  seconds: ParsedField;
  minutes: ParsedField;
  hours: ParsedField;
  /** 日位：plain 路径物化（`?`/`*` = 全月）；动态日时 daysOfMonth 为空集、dynamicDay 非空 */
  daysOfMonth: ParsedField;
  months: ParsedField;
  /** 月集合 0-11（内部），items 保持 1-12 */
  monthValues: number[];
  daysOfWeek: ParsedField;
  dynamicDay: DynamicDay | null;
  dynamicWeek: DynamicWeek | null;
  /** 年集合（绝对年份，升序）；null = 无年段 */
  years: number[] | null;
}

export type ParseResult =
  | { ok: true; value: ParsedCron }
  | { ok: false; code: CronDiagnosticCode };

export type CronFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
