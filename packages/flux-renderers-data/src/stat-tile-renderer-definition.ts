import type { RendererDefinition } from '@nop-chaos/flux-core';
import { StatTileRenderer } from './stat-tile-renderer.js';

/**
 * `stat-tile` renderer definition (BI KPI card).
 *
 * Extracted from `data-renderer-definitions.ts` to keep that file under the
 * 700-line lint cap.
 */
export const statTileRendererDefinition: RendererDefinition = {
  type: 'stat-tile',
  displayName: 'Stat Tile',
  category: 'data',
  sourcePackage: '@nop-chaos/flux-renderers-data',
  component: StatTileRenderer,
  propContracts: {
    value: {
      shape: { kind: 'unknown' },
      displayName: 'Value',
      description:
        'KPI number. Supports ${expr} expressions; null/undefined/non-numeric renders the `--` placeholder.',
      editorType: 'expression',
    },
    delta: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'number' },
          {
            kind: 'object',
            fields: {
              value: { kind: 'number' },
              label: { kind: 'string' },
              direction: {
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
      displayName: 'Delta',
      description:
        'Year-over-year / period-over-period change. A number is a percent (12.5 = +12.5%); an object adds an explicit label and direction.',
      editorType: 'object',
    },
    sparkline: {
      shape: { kind: 'array', item: { kind: 'number' } },
      displayName: 'Sparkline',
      description:
        'Mini-chart data as number[] (or an expression resolving to one). Empty/invalid data degrades to no sparkline; the KPI number still renders.',
      editorType: 'expression',
    },
    formatter: {
      shape: {
        kind: 'object',
        fields: {
          thousands: { kind: 'boolean' },
          decimals: { kind: 'number' },
        },
      },
      displayName: 'Formatter',
      description: 'Number formatting: thousands separator and decimal places (defaults 0).',
      editorType: 'object',
    },
    status: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'up' },
          { kind: 'literal', value: 'down' },
          { kind: 'literal', value: 'neutral' },
        ],
      },
      displayName: 'Status',
      description:
        'Explicit rise/fall color, overriding the delta sign derivation. up = positive color, down = negative color, neutral = muted.',
      editorType: 'select',
    },
  },
  fields: [
    { key: 'value', kind: 'prop' },
    { key: 'label', kind: 'value-or-region', regionKey: 'label' },
    { key: 'prefix', kind: 'prop' },
    { key: 'suffix', kind: 'prop' },
    { key: 'delta', kind: 'prop' },
    { key: 'sparkline', kind: 'prop' },
    { key: 'formatter', kind: 'prop' },
    { key: 'status', kind: 'prop' },
  ],
};
