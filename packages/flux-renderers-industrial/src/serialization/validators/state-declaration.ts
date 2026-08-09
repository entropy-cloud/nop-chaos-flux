import { checkNumberField, isPlainObject } from './helpers.js';

export function validateStateDeclaration(value: unknown, errors: string[], scope: string): void {
  if (!isPlainObject(value)) {
    errors.push(`${scope} must be an object`);
    return;
  }
  const decl = value as Record<string, unknown>;
  if (!isPlainObject(decl.states)) {
    errors.push(`${scope}.states must be an object`);
  } else {
    for (const [stateName, stateValue] of Object.entries(decl.states)) {
      if (!isPlainObject(stateValue)) {
        errors.push(`${scope}.states.${stateName} must be an object`);
      }
    }
  }
  if ('ranges' in decl) {
    if (!Array.isArray(decl.ranges)) {
      errors.push(`${scope}.ranges must be an array`);
    } else {
      decl.ranges.forEach((range, index) => {
        if (!isPlainObject(range)) {
          errors.push(`${scope}.ranges[${index}] must be an object`);
          return;
        }
        const rangeScope = `${scope}.ranges[${index}]`;
        checkNumberField(range as Record<string, unknown>, 'min', errors, rangeScope);
        checkNumberField(range as Record<string, unknown>, 'max', errors, rangeScope);
        if (typeof (range as Record<string, unknown>).state !== 'string') {
          errors.push(`${rangeScope}.state must be a string`);
        }
      });
    }
  }
  if ('booleanMap' in decl) {
    if (!isPlainObject(decl.booleanMap)) {
      errors.push(`${scope}.booleanMap must be an object`);
    } else {
      const booleanMap = decl.booleanMap as Record<string, unknown>;
      if (typeof booleanMap.true !== 'string' || typeof booleanMap.false !== 'string') {
        errors.push(`${scope}.booleanMap must contain string true/false states`);
      }
    }
  }
  if ('valueMap' in decl && !isPlainObject(decl.valueMap)) {
    errors.push(`${scope}.valueMap must be an object`);
  }
  // plan 2026-08-05-0653-3 B3：stateSource 为非空字符串（格式 "pointId" 或 "pointId.property"）。
  if ('stateSource' in decl && (typeof decl.stateSource !== 'string' || decl.stateSource.trim() === '')) {
    errors.push(`${scope}.stateSource must be a non-empty string`);
  }
}
