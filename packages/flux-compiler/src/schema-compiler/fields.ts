import type {
  BaseSchema,
  NodeMetaProgram,
  CompiledRuntimeValue,
  ExpressionCompiler,
  RendererDefinition,
  SchemaFieldRule,
} from '@nop-chaos/flux-core';
import { META_FIELDS } from '@nop-chaos/flux-core';

export const DEFAULT_FIELD_RULES: Record<string, SchemaFieldRule> = {
  body: { key: 'body', kind: 'region', regionKey: 'body' },
  actions: { key: 'actions', kind: 'region', regionKey: 'actions' },
  header: { key: 'header', kind: 'region', regionKey: 'header' },
  footer: { key: 'footer', kind: 'region', regionKey: 'footer' },
  toolbar: { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
  dialog: { key: 'dialog', kind: 'prop' },
  columns: { key: 'columns', kind: 'prop' },
};

const LIFECYCLE_KEYS = new Set(['onMount', 'onUnmount']);

export function classifyField(renderer: RendererDefinition, key: string): SchemaFieldRule {
  const explicit = renderer.fields?.find((field) => field.key === key);

  if (explicit) {
    return explicit;
  }

  if (META_FIELDS.has(key)) {
    return { key, kind: 'meta' };
  }

  if (LIFECYCLE_KEYS.has(key)) {
    return { key, kind: 'ignored' };
  }

  if (/^on[A-Z]/.test(key)) {
    return { key, kind: 'event' };
  }

  return DEFAULT_FIELD_RULES[key] ?? { key, kind: 'prop' };
}

export function buildMetaProgram(
  schema: BaseSchema,
  renderer: RendererDefinition,
  expressionCompiler: ExpressionCompiler,
): NodeMetaProgram {
  const meta: NodeMetaProgram = {};

  for (const key of META_FIELDS) {
    if (classifyField(renderer, key).kind !== 'meta') {
      continue;
    }

    const value = schema[key as keyof BaseSchema];

    if (value === undefined) {
      continue;
    }

    switch (key) {
      case 'id':
      case 'className':
      case 'frameClassName':
      case 'when':
      case 'visible':
      case 'hidden':
      case 'disabled':
      case 'testid':
        meta[key] = expressionCompiler.compileValue(value as any);
        break;
    }
  }

  return meta;
}

export { buildMetaProgram as buildCompiledMeta };

export function isCompiledStatic(compiled: CompiledRuntimeValue<unknown> | undefined): boolean {
  return !compiled || compiled.kind === 'static';
}
