import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import React from 'react';

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined,
};

export const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

export const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

export const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: (props) => (
    <button
      type="button"
      data-testid={props.meta.testid ?? undefined}
      onClick={() => void props.events.onClick?.()}
    >
      {String(props.props.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

export function createLayoutSchemaRenderer(extra: RendererDefinition[] = []) {
  return createSchemaRenderer([
    pageRenderer,
    textRenderer,
    buttonRenderer,
    ...extra,
    // Inline minimal layout definitions to avoid import cycle with the package entry.
    {
      type: 'wizard',
      displayName: 'Wizard',
      category: 'layout',
      sourcePackage: '@nop-chaos/flux-renderers-layout',
      component: WizardRendererForTest,
      deepFields: [
        {
          key: 'steps',
          nestedRegions: [
            {
              key: 'title',
              regionKeySuffix: 'title',
              compiledKey: 'titleRegionKey',
              params: ['step', 'index', 'key'],
              isolate: false,
            },
            {
              key: 'body',
              regionKeySuffix: 'body',
              compiledKey: 'bodyRegionKey',
              params: ['step', 'index', 'key'],
              isolate: false,
            },
            {
              key: 'actions',
              regionKeySuffix: 'actions',
              compiledKey: 'actionsRegionKey',
              params: ['step', 'index', 'key'],
              isolate: false,
            },
          ],
          booleanKeys: ['disabled', 'optional'],
          normalize: wizardStepsNormalize,
        },
      ],
      fields: [
        { key: 'steps', kind: 'prop' },
        { key: 'value', kind: 'prop' },
        { key: 'defaultValue', kind: 'prop' },
        { key: 'valueOwnership', kind: 'prop' },
        { key: 'valueStatePath', kind: 'prop' },
        { key: 'statusPath', kind: 'prop' },
        { key: 'linear', kind: 'prop', valueType: 'boolean' },
        { key: 'allowStepJump', kind: 'prop', valueType: 'boolean' },
        { key: 'mountOnEnter', kind: 'prop', valueType: 'boolean' },
        { key: 'unmountOnExit', kind: 'prop', valueType: 'boolean' },
        { key: 'onChange', kind: 'event' },
        { key: 'onStepCommit', kind: 'event' },
        { key: 'onComplete', kind: 'event' },
        { key: 'onStepError', kind: 'event' },
      ],
    },
    {
      type: 'grid',
      displayName: 'Grid',
      category: 'layout',
      sourcePackage: '@nop-chaos/flux-renderers-layout',
      component: GridRendererForTest,
      deepFields: [
        {
          key: 'items',
          nestedRegions: [
            {
              key: 'body',
              regionKeySuffix: 'body',
              compiledKey: 'bodyRegionKey',
              params: ['item', 'index', 'key'],
              isolate: false,
            },
          ],
          normalize: gridItemsNormalize,
        },
      ],
      fields: [
        { key: 'items', kind: 'prop' },
        { key: 'columns', kind: 'prop' },
        { key: 'gap', kind: 'prop' },
        { key: 'autoFlow', kind: 'prop' },
        { key: 'alignItems', kind: 'prop' },
        { key: 'justifyItems', kind: 'prop' },
      ],
    },
    {
      type: 'collapse',
      displayName: 'Collapse',
      category: 'layout',
      sourcePackage: '@nop-chaos/flux-renderers-layout',
      component: CollapseRendererForTest,
      deepFields: [
        {
          key: 'items',
          nestedRegions: [
            {
              key: 'title',
              regionKeySuffix: 'title',
              compiledKey: 'titleRegionKey',
              params: ['item', 'index', 'key'],
              isolate: false,
            },
            {
              key: 'body',
              regionKeySuffix: 'body',
              compiledKey: 'bodyRegionKey',
              params: ['item', 'index', 'key'],
              isolate: false,
            },
          ],
          booleanKeys: ['disabled'],
          normalize: collapseItemsNormalize,
        },
      ],
      fields: [
        { key: 'items', kind: 'prop' },
        { key: 'value', kind: 'prop' },
        { key: 'defaultValue', kind: 'prop' },
        { key: 'valueOwnership', kind: 'prop' },
        { key: 'valueStatePath', kind: 'prop' },
        { key: 'multiple', kind: 'prop', valueType: 'boolean' },
        { key: 'collapsible', kind: 'prop', valueType: 'boolean' },
        { key: 'onChange', kind: 'event' },
      ],
    },
    {
      type: 'button-group',
      displayName: 'Button Group',
      category: 'layout',
      sourcePackage: '@nop-chaos/flux-renderers-layout',
      component: ButtonGroupRendererForTest,
      fields: [
        { key: 'items', kind: 'prop' },
        { key: 'orientation', kind: 'prop' },
        { key: 'variant', kind: 'prop' },
        { key: 'size', kind: 'prop' },
        { key: 'selectionMode', kind: 'prop' },
        { key: 'value', kind: 'prop' },
        { key: 'defaultValue', kind: 'prop' },
        { key: 'onChange', kind: 'event' },
      ],
    },
    {
      type: 'dropdown-button',
      displayName: 'Dropdown Button',
      category: 'layout',
      sourcePackage: '@nop-chaos/flux-renderers-layout',
      component: DropdownButtonRendererForTest,
      fields: [
        { key: 'label', kind: 'value-or-region', regionKey: 'label' },
        { key: 'icon', kind: 'prop' },
        { key: 'variant', kind: 'prop' },
        { key: 'size', kind: 'prop' },
        { key: 'items', kind: 'prop' },
        { key: 'trigger', kind: 'prop' },
        { key: 'disabled', kind: 'prop', valueType: 'boolean' },
      ],
    },
  ]);
}

import { extractNestedSchemaRegions } from '@nop-chaos/flux-core';
import { GridRenderer as GridRendererForTest } from './grid-renderer.js';
import { CollapseRenderer as CollapseRendererForTest } from './collapse-renderer.js';
import { ButtonGroupRenderer as ButtonGroupRendererForTest } from './button-group-renderer.js';
import { DropdownButtonRenderer as DropdownButtonRendererForTest } from './dropdown-button-renderer.js';
import { WizardRenderer as WizardRendererForTest } from './wizard-renderer.js';

function wizardStepsNormalize(input: {
  value: unknown;
  path: string;
  regions: Record<string, import('@nop-chaos/flux-core').TemplateRegion>;
  compileSchema: (
    schemaInput: import('@nop-chaos/flux-core').SchemaInput,
    options?: import('@nop-chaos/flux-core').CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => import('@nop-chaos/flux-core').TemplateNode | import('@nop-chaos/flux-core').TemplateNode[];
}) {
  if (!Array.isArray(input.value)) return input.value;
  return input.value.map((item, index) => {
    if (!item || typeof item !== 'object') return item;
    const normalized = extractNestedSchemaRegions({
      candidate: item as Record<string, unknown>,
      itemRegionPath: `${input.path}.steps[${index}]`,
      itemRegionKeyPrefix: `steps.${index}`,
      rules: [
        {
          key: 'title',
          regionKeySuffix: 'title',
          compiledKey: 'titleRegionKey',
          params: ['step', 'index', 'key'] as readonly string[],
          isolate: false,
        },
        {
          key: 'body',
          regionKeySuffix: 'body',
          compiledKey: 'bodyRegionKey',
          params: ['step', 'index', 'key'] as readonly string[],
          isolate: false,
        },
        {
          key: 'actions',
          regionKeySuffix: 'actions',
          compiledKey: 'actionsRegionKey',
          params: ['step', 'index', 'key'] as readonly string[],
          isolate: false,
        },
      ],
      regions: input.regions,
      compileSchema: input.compileSchema,
    }).value as Record<string, unknown>;
    for (const booleanKey of ['disabled', 'optional']) {
      if (normalized[booleanKey] !== undefined) {
        normalized[booleanKey] = {
          __nopPreserveLiteral: true,
          value: normalized[booleanKey] === true,
        };
      }
    }
    return normalized;
  });
}

function gridItemsNormalize(input: {
  value: unknown;
  path: string;
  regions: Record<string, import('@nop-chaos/flux-core').TemplateRegion>;
  compileSchema: (
    schemaInput: import('@nop-chaos/flux-core').SchemaInput,
    options?: import('@nop-chaos/flux-core').CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => import('@nop-chaos/flux-core').TemplateNode | import('@nop-chaos/flux-core').TemplateNode[];
}) {
  if (!Array.isArray(input.value)) return input.value;
  return input.value.map((item, index) => {
    if (!item || typeof item !== 'object') return item;
    return extractNestedSchemaRegions({
      candidate: item as Record<string, unknown>,
      itemRegionPath: `${input.path}.items[${index}]`,
      itemRegionKeyPrefix: `items.${index}`,
      rules: [
        {
          key: 'body',
          regionKeySuffix: 'body',
          compiledKey: 'bodyRegionKey',
          params: ['item', 'index', 'key'] as readonly string[],
          isolate: false,
        },
      ],
      regions: input.regions,
      compileSchema: input.compileSchema,
    }).value as Record<string, unknown>;
  });
}

function collapseItemsNormalize(input: {
  value: unknown;
  path: string;
  regions: Record<string, import('@nop-chaos/flux-core').TemplateRegion>;
  compileSchema: (
    schemaInput: import('@nop-chaos/flux-core').SchemaInput,
    options?: import('@nop-chaos/flux-core').CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => import('@nop-chaos/flux-core').TemplateNode | import('@nop-chaos/flux-core').TemplateNode[];
}) {
  if (!Array.isArray(input.value)) return input.value;
  return input.value.map((item, index) => {
    if (!item || typeof item !== 'object') return item;
    const normalized = extractNestedSchemaRegions({
      candidate: item as Record<string, unknown>,
      itemRegionPath: `${input.path}.items[${index}]`,
      itemRegionKeyPrefix: `items.${index}`,
      rules: [
        {
          key: 'title',
          regionKeySuffix: 'title',
          compiledKey: 'titleRegionKey',
          params: ['item', 'index', 'key'] as readonly string[],
          isolate: false,
        },
        {
          key: 'body',
          regionKeySuffix: 'body',
          compiledKey: 'bodyRegionKey',
          params: ['item', 'index', 'key'] as readonly string[],
          isolate: false,
        },
      ],
      regions: input.regions,
      compileSchema: input.compileSchema,
    }).value as Record<string, unknown>;
    if (normalized.disabled !== undefined) {
      normalized.disabled = {
        __nopPreserveLiteral: true,
        value: normalized.disabled === true,
      };
    }
    return normalized;
  });
}

export { env };
export const formulaCompiler = createFormulaCompiler();
