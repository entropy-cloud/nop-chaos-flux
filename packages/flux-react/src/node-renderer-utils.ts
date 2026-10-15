import type { FrameWrapMode, XuiImportSpec } from '@nop-chaos/flux-core';

/**
 * The single boolean→vocabulary normalization point for the frame family
 * (RM-2, plan 604). Authored per-instance `frameWrap` wins; without it the
 * definition-level default applies (plan 460 B3: radio/checkbox-group default
 * to the grouped fieldset layout); renderers that are not wrap-compatible
 * never frame.
 */
export function resolveFrameWrapMode(
  definitionWrap: boolean | undefined,
  definitionFrameWrap: 'label' | 'group' | 'none' | undefined,
  schemaFrameWrap: FrameWrapMode | undefined,
): 'label' | 'group' | 'none' {
  if (!definitionWrap) {
    return 'none';
  }

  if (schemaFrameWrap === false || schemaFrameWrap === 'none') {
    return 'none';
  }

  if (schemaFrameWrap === 'group') {
    return 'group';
  }

  if (schemaFrameWrap === true || schemaFrameWrap === 'label') {
    return 'label';
  }

  if (definitionFrameWrap === 'group') {
    return 'group';
  }

  if (definitionFrameWrap === 'none') {
    return 'none';
  }

  return 'label';
}

export function collectSchemaImports(input: unknown): readonly XuiImportSpec[] {
  const seen = new Map<string, XuiImportSpec>();

  function visit(value: unknown): void {
    if (!value || typeof value !== 'object') {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    const record = value as Record<string, unknown>;
    const imports = record['xui:imports'];
    if (Array.isArray(imports)) {
      for (const spec of imports) {
        if (!spec || typeof spec !== 'object') {
          continue;
        }
        const normalized = spec as XuiImportSpec;
        const key = JSON.stringify({
          from: normalized.from ?? '',
          as: normalized.as ?? '',
          options: normalized.options ?? null,
        });
        if (!seen.has(key)) {
          seen.set(key, normalized);
        }
      }
    }

    for (const child of Object.values(record)) {
      visit(child);
    }
  }

  visit(input);
  return Array.from(seen.values());
}

export function shouldWarnOnImportFailure(): boolean {
  const nodeEnv =
    'process' in globalThis
      ? (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV
      : undefined;
  return nodeEnv !== 'production';
}
