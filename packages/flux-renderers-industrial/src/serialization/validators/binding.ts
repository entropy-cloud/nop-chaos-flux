import { isPlainObject } from './helpers.js';

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
  if ('scale' in binding && !isPlainObject(binding.scale)) {
    errors.push(`${scope}.scale must be an object`);
  }
  if ('format' in binding && typeof binding.format !== 'string') {
    errors.push(`${scope}.format must be a string`);
  }
}
