import type { FluxValueShape, RendererDefinition } from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import type { EChartsSchema } from './echarts-schemas.js';
import { validateEChartsSchema } from './echarts-schema-validation.js';

export const LazyEChartsRenderer = createLazyRendererComponent<EChartsSchema>(
  () => import('./echarts-renderer.js').then((m) => m.EChartsRenderer),
);

const ECHARTS_RENDERER_SHAPE: FluxValueShape = {
  kind: 'union',
  anyOf: [
    { kind: 'literal', value: 'canvas' },
    { kind: 'literal', value: 'svg' },
  ],
};

const ECHARTS_HEIGHT_SHAPE: FluxValueShape = {
  kind: 'union',
  anyOf: [{ kind: 'number' }, { kind: 'string' }],
};

export const echartsRendererDefinition: RendererDefinition = {
  type: 'echarts',
  displayName: 'ECharts',
  category: 'data',
  sourcePackage: '@nop-chaos/flux-renderers-data',
  component: LazyEChartsRenderer,
  schemaValidator: validateEChartsSchema,
  propContracts: {
    renderer: {
      displayName: 'Renderer',
      shape: ECHARTS_RENDERER_SHAPE,
      editorType: 'select',
      defaultValue: 'canvas',
    },
    notMerge: {
      displayName: 'Not Merge',
      shape: { kind: 'boolean' },
      editorType: 'switch',
    },
    lazyUpdate: {
      displayName: 'Lazy Update',
      shape: { kind: 'boolean' },
      editorType: 'switch',
    },
    height: {
      displayName: 'Height',
      shape: ECHARTS_HEIGHT_SHAPE,
      editorType: 'expression',
    },
  },
  componentCapabilityContracts: [
    {
      handle: 'resize',
      displayName: 'Resize',
      description: 'Request the current echarts instance to recompute its layout.',
    },
  ],
  fields: [
    { key: 'option', kind: 'prop' },
    { key: 'dataset', kind: 'prop' },
    { key: 'renderer', kind: 'prop' },
    { key: 'initOptions', kind: 'prop' },
    { key: 'theme', kind: 'prop' },
    { key: 'notMerge', kind: 'prop', valueType: 'boolean' },
    { key: 'lazyUpdate', kind: 'prop', valueType: 'boolean' },
    { key: 'height', kind: 'prop' },
    { key: 'componentId', kind: 'prop' },
  ],
};
