import { assertShape, checkNumberField, isPlainObject, isPrimitive } from './helpers.js';

export function validatePointDeclaration(node: unknown, seenIds: Set<string>, errors: string[], scope: string): void {
  if (!isPlainObject(node)) {
    errors.push(`${scope} must be an object`);
    return;
  }
  const decl = node as Record<string, unknown>;
  if (typeof decl.id !== 'string' || decl.id.trim() === '') {
    errors.push(`${scope}.id must be a non-empty string`);
  } else {
    if (seenIds.has(decl.id)) {
      errors.push(`duplicate point declaration id: ${decl.id}`);
    }
    seenIds.add(decl.id as string);
  }
  if (!['static', 'expression', 'flux'].includes(decl.source as string)) {
    errors.push(`${scope}.source must be one of: static | expression | flux`);
  } else if (decl.source === 'static') {
    if (!('value' in decl) || !isPrimitive(decl.value)) {
      errors.push(`${scope}.value is required and must be a primitive for source=static`);
    }
  } else if (decl.source === 'expression') {
    if (typeof decl.expression !== 'string' || decl.expression.trim() === '') {
      errors.push(`${scope}.expression must be a non-empty string for source=expression`);
    }
  } else if (typeof decl.flux !== 'string' || decl.flux.trim() === '') {
    errors.push(`${scope}.flux must be a non-empty string for source=flux`);
  }
  if ('scale' in decl) {
    if (!isPlainObject(decl.scale)) {
      errors.push(`${scope}.scale must be an object`);
    } else if ('expression' in (decl.scale as Record<string, unknown>)) {
      // plan 2026-08-05-0653-3 B4：declaration 级 scale.expression 经 point-store.convert 与
      // value-to-state.applyLinearScale 两处静默丢弃（无 compiler 求值）。binding 层 applyScale 已消费
      // expression-scale（经 evaluator），故 declaration 级拒绝并指向 binding-scale，同时关闭两处 drop site。
      errors.push(
        `${scope}.scale.expression is not supported at declaration level; use binding-level scale.expression instead`,
      );
    } else {
      // plan 2026-08-06-0900-1 P2-6：linear scale 子形状校验（k/b 非数值静默 corrupt 点表量程换算）。
      assertShape(decl.scale as Record<string, unknown>, { k: 'number', b: 'number' }, `${scope}.scale`, errors);
    }
  }
  // plan 2026-08-06-0900-1 P2-6：init 为点初始值，须为 primitive（malformed 静默 corrupt 点表，后果最重）。
  if ('init' in decl && !isPrimitive(decl.init)) {
    errors.push(`${scope}.init must be a primitive (number, boolean, or string)`);
  }
  if ('deadband' in decl) {
    // plan 2026-08-06-0900-1 P2-3：deadband 路由 checkNumberField 享 finite 守卫（旧 inline typeof 放行 Infinity）。
    checkNumberField(decl, 'deadband', errors, scope);
  }
  if ('unit' in decl && typeof decl.unit !== 'string') {
    errors.push(`${scope}.unit must be a string`);
  }
  if ('format' in decl && typeof decl.format !== 'string') {
    errors.push(`${scope}.format must be a string`);
  }
}
