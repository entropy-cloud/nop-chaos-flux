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

const wizardStepsShape = {
  kind: 'array' as const,
  item: {
    kind: 'schema-definition' as const,
    fieldRules: {
      title: {
        kind: 'value-or-region' as const,
        regionKey: 'titleRegionKey',
        params: ['step', 'index', 'key'],
        isolate: false,
      },
      body: {
        kind: 'region' as const,
        regionKey: 'bodyRegionKey',
        params: ['step', 'index', 'key'],
        isolate: false,
      },
      actions: {
        kind: 'region' as const,
        regionKey: 'actionsRegionKey',
        params: ['step', 'index', 'key'],
        isolate: false,
      },
      disabled: 'literal' as const,
      beforeEnter: 'event' as const,
      beforeLeave: 'event' as const,
    },
  },
};

const gridItemsShape = {
  kind: 'array' as const,
  item: {
    kind: 'schema-definition' as const,
    fieldRules: {
      body: {
        kind: 'region' as const,
        regionKey: 'bodyRegionKey',
        params: ['item', 'index', 'key'],
        isolate: false,
      },
    },
  },
};

const collapseItemsShape = {
  kind: 'array' as const,
  item: {
    kind: 'schema-definition' as const,
    fieldRules: {
      title: {
        kind: 'value-or-region' as const,
        regionKey: 'titleRegionKey',
        params: ['item', 'index', 'key'],
        isolate: false,
      },
      body: {
        kind: 'region' as const,
        regionKey: 'bodyRegionKey',
        params: ['item', 'index', 'key'],
        isolate: false,
      },
      disabled: 'literal' as const,
    },
  },
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
      propContracts: {
        steps: {
          shape: wizardStepsShape,
          displayName: 'Steps',
        },
      },
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
      propContracts: {
        items: {
          shape: gridItemsShape,
          displayName: 'Items',
        },
      },
      fields: [
        { key: 'items', kind: 'prop' },
        { key: 'columns', kind: 'prop' },
        { key: 'responsiveColumns', kind: 'prop' },
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
      propContracts: {
        items: {
          shape: collapseItemsShape,
          displayName: 'Items',
        },
      },
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
    {
      type: 'steps',
      displayName: 'Steps',
      category: 'layout',
      sourcePackage: '@nop-chaos/flux-renderers-layout',
      component: StepsRendererForTest,
      fields: [
        { key: 'items', kind: 'prop' },
        { key: 'value', kind: 'prop' },
        { key: 'defaultValue', kind: 'prop' },
        { key: 'valueOwnership', kind: 'prop' },
        { key: 'valueStatePath', kind: 'prop' },
        { key: 'orientation', kind: 'prop' },
        { key: 'onChange', kind: 'event' },
      ],
    },
    {
      type: 'timeline',
      displayName: 'Timeline',
      category: 'layout',
      sourcePackage: '@nop-chaos/flux-renderers-layout',
      component: TimelineRendererForTest,
      fields: [
        { key: 'items', kind: 'prop' },
        { key: 'mode', kind: 'prop' },
        { key: 'orientation', kind: 'prop' },
        { key: 'reverse', kind: 'prop', valueType: 'boolean' },
      ],
    },
  ]);
}

import { GridRenderer as GridRendererForTest } from './grid-renderer.js';
import { CollapseRenderer as CollapseRendererForTest } from './collapse-renderer.js';
import { ButtonGroupRenderer as ButtonGroupRendererForTest } from './button-group-renderer.js';
import { DropdownButtonRenderer as DropdownButtonRendererForTest } from './dropdown-button-renderer.js';
import { WizardRenderer as WizardRendererForTest } from './wizard-renderer.js';
import { StepsRenderer as StepsRendererForTest } from './steps-renderer.js';
import { TimelineRenderer as TimelineRendererForTest } from './timeline-renderer.js';

export { env };
export const formulaCompiler = createFormulaCompiler();
