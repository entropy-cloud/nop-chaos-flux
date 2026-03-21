import type {
  AmisDebuggerRedactionMatchContext,
  AmisDebuggerRedactionOptions
} from './types';

const DEFAULT_REDACT_KEYS = ['token', 'authorization', 'cookie', 'password', 'secret', 'accessKey', 'refreshToken'];

export type NormalizedRedactionOptions = Required<Pick<AmisDebuggerRedactionOptions, 'enabled' | 'redactKeys' | 'mask' | 'maxDepth'>> &
  Pick<AmisDebuggerRedactionOptions, 'redactValue' | 'allowValue'>;

export function normalizeRedactionOptions(options: AmisDebuggerRedactionOptions | undefined): NormalizedRedactionOptions {
  return {
    enabled: options?.enabled ?? true,
    redactKeys: options?.redactKeys ?? DEFAULT_REDACT_KEYS,
    mask: options?.mask ?? '[REDACTED]',
    maxDepth: options?.maxDepth ?? 5,
    redactValue: options?.redactValue,
    allowValue: options?.allowValue
  };
}

function shouldRedactKey(key: string, redaction: NormalizedRedactionOptions) {
  const normalizedKey = key.toLowerCase();
  return redaction.redactKeys.some((candidate) => normalizedKey.includes(candidate.toLowerCase()));
}

export function redactData(value: unknown, redaction: NormalizedRedactionOptions, path: string[] = [], depth = 0): unknown {
  if (!redaction.enabled) {
    return value;
  }

  if (depth > redaction.maxDepth) {
    return '[MAX_DEPTH]';
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) => redactData(entry, redaction, [...path, String(index)], depth + 1));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, currentValue]) => {
      const context: AmisDebuggerRedactionMatchContext = {
        key,
        path: [...path, key],
        value: currentValue
      };

      if (redaction.allowValue?.(context)) {
        return [key, currentValue];
      }

      if (shouldRedactKey(key, redaction)) {
        return [key, redaction.redactValue?.(context) ?? redaction.mask];
      }

      return [key, redactData(currentValue, redaction, [...path, key], depth + 1)];
    })
  );
}
