import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';

export function compiledRule(rule: any, path: string, index = 0) {
  return {
    id: `${path}#${index}:${rule.kind}`,
    rule,
    dependencyPaths:
      rule.kind === 'equalsField' ||
      rule.kind === 'notEqualsField' ||
      rule.kind === 'requiredWhen' ||
      rule.kind === 'requiredUnless'
        ? [rule.path]
        : [],
  };
}

export const textRenderer: RendererDefinition = {
  type: 'text',
  component: () => null,
};

export const pageRenderer: RendererDefinition = {
  type: 'page',
  component: () => null,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
  validationDefaults: {
    collectDescendantValidation: true,
  },
};

export const cardRenderer: RendererDefinition = {
  type: 'card',
  component: () => null,
  fields: [
    { key: 'title', kind: 'value-or-region', regionKey: 'title' },
    { key: 'body', kind: 'region', regionKey: 'body' },
  ],
};

export const actionButtonRenderer: RendererDefinition = {
  type: 'action-button',
  component: () => null,
  fields: [{ key: 'onClick', kind: 'event' }],
};

export const importHostRenderer: RendererDefinition = {
  type: 'import-host',
  component: () => null,
};

export const formRenderer: RendererDefinition = {
  type: 'form',
  component: () => null,
  fields: [
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'actions', kind: 'region', regionKey: 'actions' },
  ],
  scopePolicy: 'form',
  validation: {
    kind: 'container',
  },
  validationDefaults: {
    defaultChildContractMode: 'ignore',
  },
};

export const inputRenderer: RendererDefinition = {
  type: 'input-text',
  component: () => null,
  validation: {
    kind: 'field',
    getFieldPath(schema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    },
  },
};

export const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};
