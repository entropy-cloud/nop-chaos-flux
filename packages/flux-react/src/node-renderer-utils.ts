import type { TemplateNode, XuiImportSpec } from '@nop-chaos/flux-core';

export function resolveFrameWrapMode(
  definitionWrap: boolean | undefined,
  schemaFrameWrap: boolean | 'label' | 'group' | 'none' | undefined,
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

export function getNodeSchemaFrameWrap(
  node: TemplateNode,
): boolean | 'label' | 'group' | 'none' | undefined {
  return (node.schema as { frameWrap?: boolean | 'label' | 'group' | 'none' }).frameWrap;
}

export function shouldWarnOnImportFailure(): boolean {
  const nodeEnv =
    'process' in globalThis
      ? (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV
      : undefined;
  return nodeEnv !== 'production';
}
