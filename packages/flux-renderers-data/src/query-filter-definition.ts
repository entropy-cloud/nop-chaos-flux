import type { ActionSchema, RendererDefinition, RendererAuthoringTransformContext, BaseSchema } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { QueryFilterRenderer } from './query-filter.js';
import type { QueryFilterSchema } from './schemas.js';
import { resolveFormMode } from './data-schema-validation.js';

function createQueryFilterFormId(nodeId: unknown, path: string): string {
  if (typeof nodeId === 'string' && nodeId.length > 0) {
    return `${nodeId}-filter-form`;
  }

  const normalizedPath = path.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${normalizedPath || 'query-filter'}-filter-form`;
}

function asActionArray(value: ActionSchema | ActionSchema[] | undefined): ActionSchema[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function transformQueryFilterAuthoringSchema(
  context: RendererAuthoringTransformContext<BaseSchema>,
): BaseSchema {
  if (context.schema.type !== 'query-filter') {
    return context.schema;
  }

  const schema = context.schema as QueryFilterSchema;
  if (!schema.body) {
    return context.schema;
  }

  const formId = createQueryFilterFormId(schema.id ?? schema.name, context.path);
  const form: BaseSchema & Record<string, unknown> = {
    type: 'form',
    id: formId,
    body: schema.body,
    mode: resolveFormMode(schema.layout, schema.mode),
    actionsClassName: 'flex justify-end gap-2',
  };

  if (schema.columnCount !== undefined) {
    form.columnCount = schema.columnCount;
  }

  if (schema.gap !== undefined) {
    form.gap = schema.gap;
  }

  if (schema.onSubmit !== undefined) {
    form.submitAction = schema.onSubmit;
  }

  if (schema.actions !== undefined) {
    form.actions = schema.actions;
  } else {
    form.actions = [
      {
        type: 'button',
        label: schema.submitLabel ?? t('flux.common.search'),
        variant: 'primary',
        onClick: [{ action: 'component:submit', componentId: formId }],
      },
      {
        type: 'button',
        label: schema.resetLabel ?? t('flux.common.reset'),
        variant: 'outline',
        onClick: [
          { action: 'component:reset', componentId: formId },
          ...asActionArray(schema.onReset),
        ],
      },
    ];
  }

  return { ...schema, filterForm: form };
}

export const queryFilterRendererDefinition: RendererDefinition = {
  type: 'query-filter',
  displayName: 'Query Filter',
  category: 'data',
  sourcePackage: '@nop-chaos/flux-renderers-data',
  authoringTransform: transformQueryFilterAuthoringSchema,
  propContracts: {
    body: {
      shape: { kind: 'schema-definition', fieldRules: {} },
      displayName: 'Body',
      description: 'Query fields rendered through the embedded form (region carrier).',
    },
    togglable: {
      shape: {
        kind: 'union',
        anyOf: [{ kind: 'boolean' }, { kind: 'object', fields: {} }],
      },
      displayName: 'Togglable',
      description:
        'Expand/collapse semantics: true or a config object (defaultCollapsed/collapsedLabel/expandedLabel) enables the collapse envelope around the embedded form.',
      editorType: 'object',
    },
    submitLabel: {
      shape: { kind: 'string' },
      displayName: 'Submit Label',
      description: 'Label of the default Search button (defaults to the i18n search message).',
      editorType: 'text',
    },
    resetLabel: {
      shape: { kind: 'string' },
      displayName: 'Reset Label',
      description: 'Label of the default Reset button (defaults to the i18n reset message).',
      editorType: 'text',
    },
    onSubmit: {
      shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true },
      displayName: 'Submit Action',
      description:
        'Query chain dispatched through the embedded form submit pipeline (validation then submit). Lowered onto the embedded form by the authoring transform.',
    },
    onReset: {
      shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true },
      displayName: 'Reset Action',
      description:
        'Reset chain dispatched after the embedded form resets. Lowered onto the default Reset button by the authoring transform.',
    },
  },
  component: QueryFilterRenderer,
  fields: [
    { key: 'body', kind: 'prop' },
    { key: 'actions', kind: 'prop' },
    { key: 'filterForm', kind: 'region', regionKey: 'filterForm' },
    { key: 'mode', kind: 'prop' },
    { key: 'layout', kind: 'prop' },
    { key: 'columnCount', kind: 'prop' },
    { key: 'gap', kind: 'prop' },
    { key: 'submitLabel', kind: 'prop' },
    { key: 'resetLabel', kind: 'prop' },
    { key: 'togglable', kind: 'prop' },
    { key: 'onSubmit', kind: 'prop' },
    { key: 'onReset', kind: 'prop' },
  ],
};
