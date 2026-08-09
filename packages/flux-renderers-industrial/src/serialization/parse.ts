import type { ScadaConfig } from './config-types.js';

/**
 * 解析 SCADA config（design-renderer.md §4.3）。
 *
 * 接受 JSON 字符串或纯对象，返回**深隔离**的 `ScadaConfig`（与入参不共享嵌套引用，调用方 mutate 不回流）。
 *
 * fail-closed 纪律（plan 2026-08-08-1931-2 Phase 1 / F5）：非纯对象 input（数组 / null / 原始值 / 非 Scada 结构）
 * 抛 `scada config must be an object`，不再 `as ScadaConfig` cast 返回（旧实现的类型谎言）。与 validate 广度
 * （`validate.ts` 的 `isPlainObject` 守卫）对齐——parse = 语法层（JSON 合法性 + 纯对象窄化），validate = 语义层。
 */
export function parseScadaConfig(input: string | object): ScadaConfig {
  const value: unknown = typeof input === 'string' ? parseJson(input) : input;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('scada config must be an object');
  }
  return structuredClone(value) as ScadaConfig;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid scada config JSON: ${message}`);
  }
}
