import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { SparklineRenderer } from './sparkline-renderer.js';
import { validateSparklineSchema } from './sparkline-schema-validation.js';

/**
 * `sparkline` renderer definition (自绘 SVG 迷你趋势图原子组件)。
 *
 * Extracted from `data-renderer-definitions.ts` to keep that file under the
 * 700-line lint cap (stat-tile precedent).
 */
export const sparklineRendererDefinition: RegisteredRendererDefinition = {
  type: 'sparkline',
  displayName: 'Sparkline',
  category: 'data',
  sourcePackage: '@nop-chaos/flux-renderers-data',
  component: SparklineRenderer,
  schemaValidator: validateSparklineSchema,
  fields: [
    {
      key: 'data',
      kind: 'prop',
      contract: {
        shape: { kind: 'array', item: { kind: 'number' } },
        displayName: 'Data',
        description:
          'Mini trend data as number[] (or an expression resolving to one). Empty/invalid data degrades to an empty placeholder.',
        editorType: 'expression',
      },
    },
    {
      key: 'width',
      kind: 'prop',
      contract: {
        shape: { kind: 'number' },
        displayName: 'Width',
        description: 'Canvas width in px. Defaults to 120.',
        editorType: 'number',
        defaultValue: 120,
      },
    },
    {
      key: 'height',
      kind: 'prop',
      contract: {
        shape: { kind: 'number' },
        displayName: 'Height',
        description: 'Canvas height in px. Defaults to 32.',
        editorType: 'number',
        defaultValue: 32,
      },
    },
    {
      key: 'color',
      kind: 'prop',
      contract: {
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'string' },
            {
              kind: 'object',
              fields: {
                status: {
                  kind: 'union',
                  anyOf: [
                    { kind: 'literal', value: 'up' },
                    { kind: 'literal', value: 'down' },
                    { kind: 'literal', value: 'neutral' },
                  ],
                },
              },
            },
          ],
        },
        displayName: 'Color',
        description:
          'Static stroke color, or { status } to resolve the trend-semantic CSS variable (up/down/neutral). Defaults to the direction derived from first vs last value.',
        editorType: 'object',
      },
    },
    {
      key: 'fill',
      kind: 'prop',
      valueType: 'boolean',
      contract: {
        shape: { kind: 'boolean' },
        displayName: 'Fill',
        description: 'Render a gradient fill below the line. Defaults to false.',
        editorType: 'switch',
        defaultValue: false,
      },
    },
    {
      key: 'smooth',
      kind: 'prop',
      valueType: 'boolean',
      contract: {
        shape: { kind: 'boolean' },
        displayName: 'Smooth',
        description: 'Render a bezier-smoothed curve instead of a polyline. Defaults to false.',
        editorType: 'switch',
        defaultValue: false,
      },
    },
    {
      key: 'min',
      kind: 'prop',
      contract: {
        shape: { kind: 'number' },
        displayName: 'Min',
        description: 'Explicit Y-domain lower bound. Defaults to the data minimum.',
        editorType: 'number',
      },
    },
    {
      key: 'max',
      kind: 'prop',
      contract: {
        shape: { kind: 'number' },
        displayName: 'Max',
        description: 'Explicit Y-domain upper bound. Defaults to the data maximum.',
        editorType: 'number',
      },
    },
  ],
};
