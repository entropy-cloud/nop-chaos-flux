import { assertShape, isPlainObject } from './helpers.js';

export function validateBinding(value: unknown, errors: string[], scope: string): void {
  if (!isPlainObject(value)) {
    errors.push(`${scope} must be an object`);
    return;
  }
  const binding = value as Record<string, unknown>;
  if (Object.keys(binding).length === 0) {
    errors.push(`${scope} must contain at least one of: point | expression | map | scale | format`);
    return;
  }
  if ('point' in binding && (typeof binding.point !== 'string' || binding.point.trim() === '')) {
    errors.push(`${scope}.point must be a non-empty string`);
  }
  if ('expression' in binding && (typeof binding.expression !== 'string' || binding.expression.trim() === '')) {
    errors.push(`${scope}.expression must be a non-empty string`);
  }
  if ('map' in binding && !isPlainObject(binding.map)) {
    errors.push(`${scope}.map must be an object`);
  }
  if ('scale' in binding) {
    // plan 2026-08-09-0121-2 Workstream A F10：binding.scale 校验从仅 isPlainObject 升级为与 declaration
    // scale 同形 finite k/b 校验（复用 1809-1 产出的 isFiniteNumber via assertShape number 分支）。
    // binding 层支持 expression-scale（bind-resolver applyScale 求值），与 declaration 层（拒 expression）不同，
    // 故 expression-scale 分支校验非空字符串；linear 分支 assertShape {k,b} 拒 NaN/Infinity（旧 typeof-only
    // 放行 → applyScale k*x+b 产 NaN/Infinity corrupt 绑定值）。
    if (!isPlainObject(binding.scale)) {
      errors.push(`${scope}.scale must be an object`);
    } else if ('expression' in (binding.scale as Record<string, unknown>)) {
      const expr = (binding.scale as Record<string, unknown>).expression;
      if (typeof expr !== 'string' || expr.trim() === '') {
        errors.push(`${scope}.scale.expression must be a non-empty string`);
      }
    } else {
      assertShape(
        binding.scale as Record<string, unknown>,
        { k: 'number', b: 'number' },
        `${scope}.scale`,
        errors,
      );
    }
  }
  if ('format' in binding && typeof binding.format !== 'string') {
    errors.push(`${scope}.format must be a string`);
  }
}
