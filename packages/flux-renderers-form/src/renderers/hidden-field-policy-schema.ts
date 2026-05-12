import type {
  BaseSchema,
  RendererSchemaValidationContext,
  HiddenFieldPolicy,
} from '@nop-chaos/flux-core';

function escapeJsonPointerSegment(segment: string) {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function toJsonPointer(path: string, key: string) {
  const parts = path
    .split('.')
    .flatMap((segment) => segment.split(/\[(\d+)\]/).filter(Boolean))
    .filter((segment) => segment !== '$')
    .concat(key);

  return `/${parts.map(escapeJsonPointerSegment).join('/')}`;
}

function isHiddenFieldPolicyShape(value: unknown): value is HiddenFieldPolicy {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function validateHiddenFieldPolicySchema(
  context: RendererSchemaValidationContext<BaseSchema>,
) {
  const value = (context.schema as { hiddenFieldPolicy?: unknown }).hiddenFieldPolicy;
  if (value === undefined) {
    return;
  }

  if (!isHiddenFieldPolicyShape(value)) {
    context.emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(context.path, 'hiddenFieldPolicy'),
      message:
        'hiddenFieldPolicy must be an object with validateWhenHidden and/or clearValueWhenHidden booleans.',
      source: 'renderer',
    });
    return;
  }

  const record = value as Record<string, unknown>;
  if (
    ('validateWhenHidden' in record && typeof record.validateWhenHidden !== 'boolean') ||
    ('clearValueWhenHidden' in record && typeof record.clearValueWhenHidden !== 'boolean')
  ) {
    context.emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(context.path, 'hiddenFieldPolicy'),
      message:
        'hiddenFieldPolicy.validateWhenHidden and hiddenFieldPolicy.clearValueWhenHidden must be booleans when provided.',
      source: 'renderer',
    });
  }
}
