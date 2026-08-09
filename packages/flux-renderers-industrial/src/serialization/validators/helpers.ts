/**
 * Per-shape 校验器共享的 helper 与常量（plan 2026-08-08-0748-1 Phase 1：validate.ts 拆分）。
 * 这些 helper 与常量被多个 per-shape 校验器以及 legacy 扫描器共用，故独立成模块。
 */

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isPrimitive(value: unknown): value is number | boolean | string {
  return typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string';
}

// plan 2026-08-08-1809-1 Phase 1（F2）：finite 数值判定的单一共享 helper。
// `typeof NaN === 'number'`、`typeof Infinity === 'number'`，旧 typeof-only 守卫（assertShape 与
// checkNumberField 各写一份）放行 NaN/±Infinity（`JSON.parse('1e400') → Infinity`），消费者读字段 raw
// 产 NaN/Infinity（几何/动画周期/量程 corrupt）。现 checkNumberField 与 assertShape number 分支共用本判定。
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function checkNumberField(
  node: Record<string, unknown>,
  field: string,
  errors: string[],
  scope: string,
): void {
  // plan 2026-08-06-0900-1 P2-3 / 2026-08-08-1809-1 Phase 1：收紧为有限数值——复用 isFiniteNumber 共享判定，
  // 与 assertShape number 分支同形（消除「同类 finite 修复只做一半」）。
  if (field in node && !isFiniteNumber(node[field])) {
    errors.push(`${scope}.${field} must be a finite number`);
  }
}

export function checkStringField(
  node: Record<string, unknown>,
  field: string,
  errors: string[],
  scope: string,
): void {
  if (field in node && typeof node[field] !== 'string') {
    errors.push(`${scope}.${field} must be a string`);
  }
}

// plan 2026-08-06-0900-1 P2-6：声明对象子形状校验 helper。validator 旧实现只校验声明对象 surface 类型，
// `shadow`/animation `from,to`/`background`/declaration `scale.k,b`/`init` 子字段 malformed 全过——消费者读
// 声明子字段 raw 产 NaN/undefined。helper 按 schema 逐字段校验类型，malformed 子字段被 validator 拒绝。
// plan 2026-08-08-1809-1 Phase 1（F2）：number 分支与 checkNumberField 同形——复用 isFiniteNumber 拒
// NaN/±Infinity，错误文案对齐 `must be a finite number`（grid.size/animation.from/scale.k 不再静默放行）。
export type ShapeFieldType = 'number' | 'string' | 'boolean' | 'object' | 'array';
export function assertShape(
  value: Record<string, unknown>,
  schema: Record<string, ShapeFieldType>,
  scope: string,
  errors: string[],
): void {
  for (const [field, expected] of Object.entries(schema)) {
    if (!(field in value)) continue;
    const v = value[field];
    let ok = false;
    switch (expected) {
      case 'number':
        ok = isFiniteNumber(v);
        break;
      case 'string':
        ok = typeof v === 'string';
        break;
      case 'boolean':
        ok = typeof v === 'boolean';
        break;
      case 'object':
        ok = isPlainObject(v);
        break;
      case 'array':
        ok = Array.isArray(v);
        break;
    }
    if (!ok) {
      errors.push(`${scope}.${field} must be a ${expected === 'number' ? 'finite number' : expected}`);
    }
  }
}

export const ANIMATION_KINDS = ['rotate', 'blink', 'flow', 'move'];
export const SYMBOL_EVENT_ONS = ['click', 'dblclick', 'hover'];
// plan 2026-08-06-0900-1 P2-9-validateSymbolNode：children 递归深度上限（fail-closed）——
// ~10k 层嵌套（恶意/损坏 host JSON）不再 stack overflow，溢出返结构化深度错误。
// 同时被 validateSymbolNode 与 scanLegacyAtSyntax 共用，故放 helper 模块（plan 2026-08-08-0748-1 DA-1）。
export const MAX_VALIDATE_DEPTH = 100;
// plan 2026-08-08-1809-1 Phase 2（F4）：config 广度/总量上限（fail-closed 早退）。低代码渲染器威胁模型里
// config 是不可信输入——旧实现仅 MAX_VALIDATE_DEPTH（深度）有上限，广度无上限，攻击者/损坏 host JSON
// 注入数百万节点（`symbols: new Array(5_000_000)`）经 validator 全量遍历 + engine 全量构建致主线程冻结/OOM。
// 阈值取 benchmark 已测上限（10 万图元，见 docs/analysis/industrial-hmi/benchmark-report.md §1）的 2× 留余量：
// 顶层 symbols / variables 各 200_000；递归期总节点数（含嵌套 children）200_000。超 cap 即 push 结构化
// error 并 O(1) / 早退（顶层 length 守卫不遍历；递归期计数超限即停止深入），与 MAX_VALIDATE_DEPTH 同纪律。
// Decision（2× 余量统一）：total 与 top-level 同阈，构造超阈用例的回归成本可控；区别于 plan 草拟的 500k
// 示例值，2× 已覆盖 benchmark 10 万合法大场景并距 DoS 量级（百万）两个数量级，足够 fail-closed。
export const MAX_SYMBOLS = 200_000;
export const MAX_VARIABLES = 200_000;
export const MAX_TOTAL_NODES = 200_000;
