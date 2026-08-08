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

export function checkNumberField(
  node: Record<string, unknown>,
  field: string,
  errors: string[],
  scope: string,
): void {
  // plan 2026-08-06-0900-1 P2-3：收紧为有限数值——`typeof NaN === 'number'`、`typeof Infinity === 'number'`，
  // 旧 typeof-only 守卫放行 NaN/±Infinity（`JSON.parse('1e400') → Infinity`），消费者读字段 raw 产 NaN/Infinity
  // （几何/动画周期/死区语义漂移）。现 Number.isFinite 拒绝非有限数值。
  if (field in node && (typeof node[field] !== 'number' || !Number.isFinite(node[field] as number))) {
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
        ok = typeof v === 'number';
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
      errors.push(`${scope}.${field} must be a ${expected}`);
    }
  }
}

export const ANIMATION_KINDS = ['rotate', 'blink', 'flow', 'move'];
export const SYMBOL_EVENT_ONS = ['click', 'dblclick', 'hover'];
// plan 2026-08-06-0900-1 P2-9-validateSymbolNode：children 递归深度上限（fail-closed）——
// ~10k 层嵌套（恶意/损坏 host JSON）不再 stack overflow，溢出返结构化深度错误。
// 同时被 validateSymbolNode 与 scanLegacyAtSyntax 共用，故放 helper 模块（plan 2026-08-08-0748-1 DA-1）。
export const MAX_VALIDATE_DEPTH = 100;
