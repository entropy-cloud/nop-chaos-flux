/**
 * `xui:actions` 编排模型（S3-2，design §11.2「批量树命令」行）。
 *
 * `xui:actions` = 节点上的命名动作链 record（`XuiActionDefinitions`：
 * `{ name: ActionSchema }`，flux-core actions 契约）。编辑器模型 =
 * record → 有序行投影；写回 = 整 record 经 `updateProps` 一次合并（一次编排
 * = 1 条 undo 步，宿主事务收口），**无需新增命令种类**（§11.2 终裁）。
 *
 * 保真纪律：非 record 形态的 `xui:actions` 原样保留（`preserved`，不猜不丢）；
 * 行内 `action`/`args` 之外的字段（`then`/`onError`/`when`…）原样保留
 * （`extras`）；未知动作类型保留并标注（action-unknown-type 失败路径）。
 */

import { CANONICAL_BUILT_IN_ACTION_NAMES } from '@nop-chaos/flux-core';

/** 已知动作类型集（flux-core 内建注册表白名单，下拉选项集）。 */
export const KNOWN_ACTION_TYPES: readonly string[] = [...CANONICAL_BUILT_IN_ACTION_NAMES].sort();

/** 单个动作行的键值对参数（值以字符串草稿态编辑，写回时 JSON 归一化）。 */
export interface ActionArgPair {
  key: string;
  value: string;
  /** 渲染态 React key（uid），不属于序列化面。 */
  uid?: string;
}

/** 动作行编辑模型。 */
export interface ActionRow {
  /** 渲染态 React key（uid），不属于序列化面。 */
  uid?: string;
  /** 链名（record 键）。空名行写回时丢弃。 */
  name: string;
  actionType: string;
  /** `false` = 不在已知集（保留 + 标注，不丢弃）。 */
  known: boolean;
  args: ActionArgPair[];
  /** `action`/`args` 之外的原样保留字段（`then`/`onError`/`when`…）。 */
  extras: Record<string, unknown>;
}

/** record → 行投影。`preservedRaw` 承载不可编辑的原样保留项（非 record 形态）。 */
export interface ActionsModel {
  rows: ActionRow[];
  /** 非 record 形态的 `xui:actions` 原样值（存在时编辑器只读，不产写回）。 */
  preservedRaw?: unknown;
  /** record 内非对象条目（键保留、值原样，写回时合并）。 */
  preservedEntries: Record<string, unknown>;
}

const STRUCTURAL_KEYS = new Set(['action', 'args']);

export function parseActionsRecord(value: unknown): ActionsModel {
  const rows: ActionRow[] = [];
  const preservedEntries: Record<string, unknown> = {};
  if (value === undefined || value === null) return { rows, preservedEntries };
  if (typeof value !== 'object' || Array.isArray(value)) {
    // 非 record 形态：整体原样保留（不失真），编辑器转只读。
    return { rows, preservedEntries, preservedRaw: value };
  }
  for (const [name, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      preservedEntries[name] = entry;
      continue;
    }
    const record = entry as Record<string, unknown>;
    const extras: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(record)) {
      if (!STRUCTURAL_KEYS.has(key)) extras[key] = val;
    }
    const actionType = typeof record.action === 'string' ? record.action : '';
    rows.push({
      name,
      actionType,
      known: KNOWN_ACTION_TYPES.includes(actionType),
      args: parseArgs(record.args),
      extras,
    });
  }
  return { rows, preservedEntries };
}

function parseArgs(value: unknown): ActionArgPair[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).map(([key, val]) => ({
    key,
    value: encodeArgValue(val),
  }));
}

/** 参数值 → 草稿字符串：字符串原样（免引号噪声），其余 JSON 序列化。 */
export function encodeArgValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/** 草稿字符串 → 参数值：JSON 可解析则归一化（数字/布尔/对象），否则原样字符串。 */
export function decodeArgValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    return JSON.parse(trimmed);
  } catch {
    return raw;
  }
}

/** 行集 → record（空名行丢弃；空 args 省略键；全空 + 无保留条目 → `null` = 删除键）。 */
export function serializeActionsRecord(model: ActionsModel): Record<string, unknown> | null {
  const out: Record<string, unknown> = { ...model.preservedEntries };
  for (const row of model.rows) {
    const trimmed = row.name.trim();
    if (!trimmed) continue;
    const entry: Record<string, unknown> = { ...row.extras };
    if (row.actionType) entry.action = row.actionType;
    const args = argsFromPairs(row.args);
    if (args !== undefined) entry.args = args;
    out[trimmed] = entry;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function argsFromPairs(pairs: ActionArgPair[]): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  for (const pair of pairs) {
    const key = pair.key.trim();
    if (!key) continue;
    out[key] = decodeArgValue(pair.value);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** 生成与既有行不冲突的新链名（取最小空闲序号：`action1`、`action2`…）。 */
export function nextActionName(rows: readonly ActionRow[]): string {
  const used = new Set(rows.map((row) => row.name));
  let index = 1;
  while (used.has(`action${index}`)) index += 1;
  return `action${index}`;
}

/** 行位移（上移/下移：record 键序即 UI 顺序）。 */
export function moveRow(rows: readonly ActionRow[], index: number, delta: -1 | 1): ActionRow[] {
  const target = index + delta;
  if (index < 0 || index >= rows.length || target < 0 || target >= rows.length) return [...rows];
  const next = [...rows];
  const [row] = next.splice(index, 1);
  next.splice(target, 0, row);
  return next;
}
