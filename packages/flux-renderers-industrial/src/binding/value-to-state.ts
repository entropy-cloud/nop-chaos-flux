import type { ScadaPrimitive, ScadaStateDeclaration } from '../serialization/config-types.js';

export interface ResolveStateOptions {
  scale?: { k?: number; b?: number } | { expression: string };
}

/**
 * 值→状态判定（I6.2）：判定链纯逻辑 值 → 换算（scale，线性）→ 区间/映射判定 → 状态。
 * 判定配置优先级：ranges → booleanMap → valueMap；无匹配 → 默认状态（优先 run，其次 states 首键）。
 */
export function resolveState(
  declaration: ScadaStateDeclaration,
  rawValue: ScadaPrimitive | undefined,
  options?: ResolveStateOptions,
): string {
  const value = applyLinearScale(rawValue, options?.scale);
  const ranges = declaration.ranges;
  if (ranges !== undefined && ranges.length > 0 && typeof value === 'number') {
    for (const range of ranges) {
      const min = range.min ?? Number.NEGATIVE_INFINITY;
      const max = range.max ?? Number.POSITIVE_INFINITY;
      if (value >= min && value <= max) return range.state;
    }
  }
  if (declaration.booleanMap !== undefined && typeof value === 'boolean') {
    return value ? declaration.booleanMap.true : declaration.booleanMap.false;
  }
  if (declaration.valueMap !== undefined && value !== undefined) {
    const state = declaration.valueMap[String(value)];
    if (state !== undefined) return state;
  }
  return defaultState(declaration);
}

function applyLinearScale(
  value: ScadaPrimitive | undefined,
  scale: ResolveStateOptions['scale'],
): ScadaPrimitive | undefined {
  if (value === undefined || scale === undefined || 'expression' in scale) return value;
  if (typeof value !== 'number') return value;
  const k = scale.k ?? 1;
  const b = scale.b ?? 0;
  return k * value + b;
}

/**
 * 默认状态偏好链（plan 2026-08-05-0653-3 B3）：run → normal → off → 首键。
 * 使 states key 整形/字母化重排不翻转 resting state 语义。优先具名偏好，全部缺席才回落首键。
 */
const DEFAULT_STATE_PREFERENCES = ['run', 'normal', 'off'] as const;

function defaultState(declaration: ScadaStateDeclaration): string {
  const keys = Object.keys(declaration.states);
  if (keys.length === 0) return 'run';
  for (const preferred of DEFAULT_STATE_PREFERENCES) {
    if (declaration.states[preferred]) return preferred;
  }
  return keys[0];
}
