import type {
  BaseSchema,
  CompiledNodeRuntimeState,
  CompiledRuntimeValue,
  CompiledSchemaMeta,
  CompiledSchemaNode,
  ExpressionCompiler,
  RendererDefinition,
  SchemaFieldRule
} from '@nop-chaos/flux-core';
import { META_FIELDS } from '@nop-chaos/flux-core';

export const DEFAULT_FIELD_RULES: Record<string, SchemaFieldRule> = {
  body: { key: 'body', kind: 'region', regionKey: 'body' },
  actions: { key: 'actions', kind: 'region', regionKey: 'actions' },
  header: { key: 'header', kind: 'region', regionKey: 'header' },
  footer: { key: 'footer', kind: 'region', regionKey: 'footer' },
  toolbar: { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
  dialog: { key: 'dialog', kind: 'prop' },
  columns: { key: 'columns', kind: 'prop' }
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

  if (renderer.regions?.includes(key)) {
    return { key, kind: 'region', regionKey: key };
  }

  if (LIFECYCLE_KEYS.has(key)) {
    return { key, kind: 'ignored' };
  }

  if (/^on[A-Z]/.test(key)) {
    return { key, kind: 'event' };
  }

  return DEFAULT_FIELD_RULES[key] ?? { key, kind: 'prop' };
}

export function buildCompiledMeta(
  schema: BaseSchema,
  renderer: RendererDefinition,
  expressionCompiler: ExpressionCompiler
): CompiledSchemaMeta {
  const meta: CompiledSchemaMeta = {};

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

export function isCompiledStatic(compiled: CompiledRuntimeValue<unknown> | undefined): boolean {
  return !compiled || compiled.kind === 'static';
}

export function createNodeRuntimeState(node: CompiledSchemaNode): CompiledNodeRuntimeState {
  const metaEntries: Record<string, any> = {};
  type LinkageEffect = NonNullable<NonNullable<CompiledSchemaNode['linkage']>['fulfill']>;
  const createEffectState = (effect: LinkageEffect | undefined) => {
    if (!effect) {
      return undefined;
    }

    const next: Record<string, any> = {};

    if (effect.visible?.kind === 'dynamic') {
      next.visible = effect.visible.createState();
    }

    if (effect.disabled?.kind === 'dynamic') {
      next.disabled = effect.disabled.createState();
    }

    if (effect.required?.kind === 'dynamic') {
      next.required = effect.required.createState();
    }

    if (effect.options?.kind === 'dynamic') {
      next.options = effect.options.createState();
    }

    return Object.keys(next).length > 0 ? next : undefined;
  };

  for (const key of Object.keys(node.meta) as Array<Extract<keyof CompiledSchemaMeta, string>>) {
    const value = node.meta[key];
    if (value?.kind === 'dynamic') {
      metaEntries[key] = value.createState();
    }
  }

  return {
    meta: metaEntries,
    props: node.props.kind === 'dynamic' ? node.props.createState() : undefined,
    linkage: node.linkage
      ? {
          when: node.linkage.when.kind === 'dynamic' ? node.linkage.when.createState() : undefined,
          fulfill: createEffectState(node.linkage.fulfill),
          otherwise: createEffectState(node.linkage.otherwise)
        }
      : undefined
  };
}
