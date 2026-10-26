import { normalizeRedactionOptions, redactData } from '@nop-chaos/nop-debugger';
import type { NopDebuggerRedactionOptions } from '@nop-chaos/nop-debugger';

export const DEFAULT_MAX_RESULT_CHARS = 20_000;

type NormalizedRedaction = ReturnType<typeof normalizeRedactionOptions>;

export function normalizeRedaction(options?: NopDebuggerRedactionOptions): NormalizedRedaction {
  return normalizeRedactionOptions(options);
}

export function truncateToCharCap(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}…[TRUNCATED]`;
}

export function applyResultRedaction(result: unknown, redaction: NormalizedRedaction): unknown {
  return redactData(result, redaction);
}

/**
 * Identity/meta allowlist projection for `inspect_node`. Deliberately drops
 * `formState`, `scopeData`, `scopeChain`, `authoringContract`, `registryEntry`,
 * and `debugData` wholesale: the model gets node identity and summary fields,
 * never raw form values or scope payloads (owner doc §Tool Surface Security).
 */
const INSPECT_ALLOWLIST = [
  'cid',
  'nodeId',
  'path',
  'rendererType',
  'mounted',
  'tagName',
  'className',
  'handleId',
  'handleName',
  'handleType',
  'instancePath',
  'availableMethods',
  'metaSummary',
  'propsSummary',
] as const;

export function projectInspectResult<T extends Record<string, unknown>>(result: T): Record<string, unknown> {
  const projected: Record<string, unknown> = {};
  for (const key of INSPECT_ALLOWLIST) {
    if (result[key] !== undefined) {
      projected[key] = result[key];
    }
  }
  return projected;
}
