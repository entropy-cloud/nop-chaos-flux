/**
 * Argument-level tool failure. Safe (authored) message — it is meant to be
 * read by the model so it can correct the call.
 */
export class ToolArgsError extends Error {}

export function requireNumber(args: Record<string, unknown>, key: string): number {
  const value = args[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ToolArgsError(
      `invalid arguments: "${key}" is required and must be a number`,
    );
  }
  return value;
}

export function optionalNumber(
  args: Record<string, unknown>,
  key: string,
  bounds?: { min?: number; max?: number },
): number | undefined {
  const value = args[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ToolArgsError(`invalid arguments: "${key}" must be a number`);
  }
  if (bounds?.min !== undefined && value < bounds.min) {
    throw new ToolArgsError(`invalid arguments: "${key}" must be >= ${bounds.min}`);
  }
  if (bounds?.max !== undefined && value > bounds.max) {
    throw new ToolArgsError(`invalid arguments: "${key}" must be <= ${bounds.max}`);
  }
  return value;
}

export function boundedNumber(
  args: Record<string, unknown>,
  key: string,
  fallback: number,
  hardMax: number,
): number {
  const value = optionalNumber(args, key, { min: 1 });
  const resolved = value ?? fallback;
  return Math.min(resolved, hardMax);
}

export function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ToolArgsError(`invalid arguments: "${key}" must be a string`);
  }
  return value;
}

export function optionalBoolean(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw new ToolArgsError(`invalid arguments: "${key}" must be a boolean`);
  }
  return value;
}

export function optionalEnum<T extends string>(
  args: Record<string, unknown>,
  key: string,
  values: readonly T[],
): T | undefined {
  const value = optionalString(args, key);
  if (value === undefined) {
    return undefined;
  }
  if (!(values as readonly string[]).includes(value)) {
    throw new ToolArgsError(
      `invalid arguments: "${key}" must be one of ${values.map((v) => `"${v}"`).join(' | ')}`,
    );
  }
  return value as T;
}

export function requireAtLeastOne(
  args: Record<string, unknown>,
  keys: readonly string[],
): void {
  if (!keys.some((key) => args[key] !== undefined)) {
    throw new ToolArgsError(
      `invalid arguments: at least one of ${keys.map((k) => `"${k}"`).join(', ')} is required`,
    );
  }
}
