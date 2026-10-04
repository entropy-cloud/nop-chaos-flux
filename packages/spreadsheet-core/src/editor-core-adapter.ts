import { registerEditorDomain, type EditorDomainAdapter } from '@nop-chaos/editor-core';
import { cloneDeep } from '@nop-chaos/flux-core';
import type { SpreadsheetDocument } from './types.js';
import { commandHandlers } from './core-dispatch.js';

/**
 * spreadsheet 域 adapter（roadmap P1.2，plan 547）：把 spreadsheet 编辑域接入 editor-core 内核契约。
 *
 * - `diff` = deepEqual 空变更返 null，否则返回 next 文档快照（**快照对即自逆 diff** 裁定，
 *   editor-core.md §6.2：SpreadsheetDocument 无结构化域 diff，全量快照对 forward/inverse
 *   对称契约平凡满足，undo 恢复语义与快照栈逐字节一致）。
 * - `applyDiff` = 返回 diff 快照（纯函数，不修改入参）。
 * - `domainCommands` = 全量 `spreadsheet:*` 命令名清单（与 `core-dispatch` handler 注册表键集
 *   相等，单测锁定 parity——命令面单一事实源）。
 */
export const SPREADSHEET_DOMAIN_KIND = 'spreadsheet';

/** diff 是否有变更（结构化深判等，与快照栈"结构化不同才入栈"语义一致）。 */
export function hasSpreadsheetDocChanges(
  prev: SpreadsheetDocument,
  next: SpreadsheetDocument,
): boolean {
  return !deepEqual(prev, next);
}

/** 结构化深判等（SpreadsheetDocument 为 JSON 形态；键序不敏感）。 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return Number.isNaN(a) && Number.isNaN(b);
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (k) =>
      Object.prototype.hasOwnProperty.call(b, k) &&
      deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

/** 构造 spreadsheet 编辑域 adapter（editor-core `EditorDomainAdapter` 契约实现）。 */
export function createSpreadsheetDomainAdapter(
  initialDocument: SpreadsheetDocument,
): EditorDomainAdapter<SpreadsheetDocument, SpreadsheetDocument> {
  return {
    kind: SPREADSHEET_DOMAIN_KIND,
    load: () => initialDocument,
    serialize: (doc) => JSON.stringify(doc),
    validate: () => ({ ok: true }),
    diff: (prev, next) => (hasSpreadsheetDocChanges(prev, next) ? next : null),
    applyDiff: (_doc, diff) => cloneDeep(diff),
    domainCommands: SPREADSHEET_DOMAIN_COMMANDS,
  };
}

/**
 * 全量 `spreadsheet:*` 命令名（`createCommandHandlerRegistry()` 注册表键集派生；
 * adapter test 断言与其 parity，防两处漂移）。
 */
export const SPREADSHEET_DOMAIN_COMMANDS: readonly string[] = [...commandHandlers.keys()].sort();

/**
 * 显式注册 spreadsheet 编辑域到 editor-core 注册表（kind: 'spreadsheet'；重复注册覆盖，
 * editor-core.md §3 裁定）。由消费侧/测试显式调用（spreadsheet-core 无 sideEffects 声明，
 * 与 plan 546 同裁定：不用模块加载 effect）。
 */
export function registerSpreadsheetDomain(initialDocument: SpreadsheetDocument): void {
  registerEditorDomain(createSpreadsheetDomainAdapter(initialDocument));
}
