import { ANIMATION_KINDS, assertShape, checkNumberField, isPlainObject } from './helpers.js';

export function validateAnimation(value: unknown, errors: string[], scope: string): void {
  if (!isPlainObject(value)) {
    errors.push(`${scope} must be an object`);
    return;
  }
  const anim = value as Record<string, unknown>;
  if (typeof anim.kind !== 'string' || !ANIMATION_KINDS.includes(anim.kind)) {
    errors.push(`${scope}.kind must be one of: ${ANIMATION_KINDS.join(' | ')}`);
  }
  checkNumberField(anim, 'period', errors, scope);
  checkNumberField(anim, 'loop', errors, scope);
  for (const field of ['from', 'to']) {
    if (field in anim) {
      const v = anim[field];
      if (typeof v === 'number') continue;
      // plan 2026-08-06-0900-1 P2-6：object 形态时校验子形状（{x:number,y:number}）。
      if (isPlainObject(v)) {
        assertShape(v, { x: 'number', y: 'number' }, `${scope}.${field}`, errors);
      } else {
        errors.push(`${scope}.${field} must be a number or an object`);
      }
    }
  }
  if ('when' in anim) {
    const when = anim.when;
    if (when !== 'always' && !(isPlainObject(when) && typeof when.state === 'string')) {
      errors.push(`${scope}.when must be 'always' or an object with a state string`);
    }
  }
}
