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

const ECHARTS_EVENT_CONTRACTS = {
  onClick: {
    displayName: 'On Click',
    description: 'ECharts native click event; payload is the echarts event params.',
    payload: { kind: 'unknown' },
  },
  onDblClick: {
    displayName: 'On Double Click',
    description: 'ECharts native dblclick event; payload is the echarts event params.',
    payload: { kind: 'unknown' },
  },
  onMouseOver: {
    displayName: 'On Mouse Over',
    description: 'ECharts native mouseover event; payload is the echarts event params.',
    payload: { kind: 'unknown' },
  },
  onMouseOut: {
    displayName: 'On Mouse Out',
    description: 'ECharts native mouseout event; payload is the echarts event params.',
    payload: { kind: 'unknown' },
  },
  onMouseDown: {
    displayName: 'On Mouse Down',
    description: 'ECharts native mousedown event; payload is the echarts event params.',
    payload: { kind: 'unknown' },
  },
  onMouseUp: {
    displayName: 'On Mouse Up',
    description: 'ECharts native mouseup event; payload is the echarts event params.',
    payload: { kind: 'unknown' },
  },
  onContextMenu: {
    displayName: 'On Context Menu',
    description: 'ECharts native contextmenu event; payload is the echarts event params.',
    payload: { kind: 'unknown' },
  },
  onDataZoom: {
    displayName: 'On Data Zoom',
    description: 'ECharts native dataZoom event; payload is the echarts event params.',
    payload: { kind: 'unknown' },
  },
  onLegendSelectChanged: {
    displayName: 'On Legend Select Changed',
    description: 'ECharts native legendselectchanged event; payload is the echarts event params.',
    payload: { kind: 'unknown' },
  },
} as const;

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
    events: {
      displayName: 'Events',
      shape: { kind: 'object', fields: {} },
      description:
        'ECharts event bindings keyed by flux on* names (onClick, onDataZoom, onLegendSelectChanged, ...); values are action schemas dispatched with the normalized echarts event params.',
      editorType: 'object',
    },
  },
  eventContracts: ECHARTS_EVENT_CONTRACTS,
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
    // events 保持 raw schema（ignored = 跳过编译期深求值）：args 里的 `${event.*}`
    // 模板必须在 dispatch 期结合 normalized event 求值（对齐 button onClick 语义），
    // 渲染期求值会在 event 不存在时抛错。
    { key: 'events', kind: 'ignored' },
    { key: 'map', kind: 'prop' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
  ],
};
