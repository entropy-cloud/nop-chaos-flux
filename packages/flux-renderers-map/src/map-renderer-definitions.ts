import type { RendererDefinition, RendererSchemaValidationContext } from '@nop-chaos/flux-core';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import type { MapSchema } from './schemas.js';

const LazyMapRenderer = createLazyRendererComponent<MapSchema>(
  () => import('./map-renderer.js').then((m) => m.MapRenderer),
);

function toJsonPointer(path: string, ...segments: Array<string | number>) {
  const parts = path.split('.').filter((segment) => segment.length > 0);
  return `/${[...parts, ...segments.map(String)].join('/')}`;
}

/**
 * mapType/cluster 类型校验：非法值 emit warning（dev 提示，不抛错、不阻断编译）。
 */
export function validateMapSchema(context: RendererSchemaValidationContext<BaseSchema>) {
  if (context.schema.type !== 'map') {
    return;
  }
  const schema = context.schema as MapSchema;
  const { emit } = context;

  if (schema.mapType !== undefined && schema.mapType !== 'pin' && schema.mapType !== 'region') {
    emit({
      code: 'invalid-property-value',
      path: toJsonPointer(context.path, 'mapType'),
      message: 'map.mapType must be "pin" or "region" when provided; falling back to "pin".',
      severity: 'warning',
    });
  }

  if (schema.cluster !== undefined && typeof schema.cluster !== 'boolean') {
    emit({
      code: 'invalid-property-value',
      path: toJsonPointer(context.path, 'cluster'),
      message: 'map.cluster must be a boolean when provided; falling back to true.',
      severity: 'warning',
    });
  }

  if (
    schema.geojsonName !== undefined &&
    schema.geojsonName !== 'china-provinces' &&
    schema.geojsonName !== 'world-countries'
  ) {
    emit({
      code: 'invalid-property-value',
      path: toJsonPointer(context.path, 'geojsonName'),
      message:
        'map.geojsonName must be "china-provinces" or "world-countries" when provided; falling back to "china-provinces".',
      severity: 'warning',
    });
  }

  if (schema.height !== undefined && typeof schema.height !== 'number') {
    emit({
      code: 'invalid-property-value',
      path: toJsonPointer(context.path, 'height'),
      message: 'map.height must be a number when provided; falling back to 400.',
      severity: 'warning',
    });
  }
}

export const mapRendererDefinitions: RendererDefinition[] = [
  {
    type: 'map',
    displayName: 'Map',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-map',
    component: LazyMapRenderer,
    schemaValidator: validateMapSchema,
    propContracts: {
      mapType: {
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'pin' },
            { kind: 'literal', value: 'region' },
          ],
        },
        displayName: 'Map Type',
        description: 'Dual mode: pin (point markers + OpenLayers built-in cluster) | region (GeoJSON choropleth).',
        editorType: 'select',
        defaultValue: 'pin',
      },
      basemap: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Basemap',
        description:
          'Tile source: { url, attribution, type: xyz|wms }. Defaults to OSM xyz. Tile keys live in the url, injected via schema/RendererEnv (no hardcoded keys).',
        editorType: 'object',
      },
      regionData: {
        shape: { kind: 'array', item: { kind: 'object', fields: {} } },
        displayName: 'Region Data',
        description: 'Region-mode values: [{ name, value }]. Evaluated via scope/data-source expressions.',
        editorType: 'expression',
      },
      geojsonName: {
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'china-provinces' },
            { kind: 'literal', value: 'world-countries' },
          ],
        },
        displayName: 'Builtin GeoJSON',
        description:
          'Builtin boundary data shipped inside the package (src/map-data/*.json, loaded with the lazy chunk). Used when geojsonSource is absent.',
        editorType: 'select',
        defaultValue: 'china-provinces',
      },
      geojsonSource: {
        shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true },
        displayName: 'GeoJSON Source',
        description:
          'Action loading custom boundary data (helpers.dispatch → FeatureCollection sanitize → cached reuse). Overrides geojsonName when present. Executed through RendererEnv (no direct fetch).',
      },
      pinData: {
        shape: { kind: 'array', item: { kind: 'object', fields: {} } },
        displayName: 'Pin Data',
        description: 'Pin-mode points: [{ name, lat, lng, value? }]. Evaluated via scope/data-source expressions.',
        editorType: 'expression',
      },
      cluster: {
        shape: { kind: 'boolean' },
        displayName: 'Cluster',
        description: 'Aggregate nearby pins with the OpenLayers built-in Cluster source.',
        editorType: 'switch',
        defaultValue: true,
      },
      visualMap: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Visual Map',
        description:
          'Color scale: { min?, max?, colors?, defaultColor? }. Values interpolate across colors, clamped outside the range.',
        editorType: 'object',
      },
      center: {
        shape: { kind: 'array', item: { kind: 'number' } },
        displayName: 'Center',
        description: 'Initial view center [lng, lat].',
        editorType: 'expression',
      },
      zoom: {
        shape: { kind: 'number' },
        displayName: 'Zoom',
        description: 'Initial zoom level. Defaults to 2 (world) / 4 (china-provinces).',
        editorType: 'number',
      },
      height: {
        shape: { kind: 'number' },
        displayName: 'Height',
        description: 'Container height in px. Defaults to 400.',
        editorType: 'number',
        defaultValue: 400,
      },
      loading: {
        shape: { kind: 'boolean' },
        displayName: 'Loading',
        description: 'External loading flag (data-source driven). Renders the loading slot when true.',
        editorType: 'switch',
        defaultValue: false,
      },
    },
    eventContracts: {
      onClick: {
        displayName: 'On Click',
        description:
          'Dispatched when a map feature is clicked (region feature or pin cluster member). Payload: { type: "map:feature-click", mapType, name, value, feature }. Empty-map clicks do not dispatch.',
        payload: {
          kind: 'object',
          fields: {
            type: { kind: 'literal', value: 'map:feature-click' },
            mapType: {
              kind: 'union',
              anyOf: [
                { kind: 'literal', value: 'pin' },
                { kind: 'literal', value: 'region' },
              ],
            },
            name: { kind: 'string' },
            value: { kind: 'unknown' },
            feature: { kind: 'object', fields: {} },
          },
        },
      },
    },
    fields: [
      { key: 'mapType', kind: 'prop' },
      { key: 'basemap', kind: 'prop' },
      { key: 'regionData', kind: 'prop' },
      { key: 'geojsonName', kind: 'prop' },
      { key: 'geojsonSource', kind: 'prop' },
      { key: 'pinData', kind: 'prop' },
      { key: 'cluster', kind: 'prop', valueType: 'boolean' },
      { key: 'visualMap', kind: 'prop' },
      { key: 'center', kind: 'prop' },
      { key: 'zoom', kind: 'prop' },
      { key: 'height', kind: 'prop' },
      { key: 'loading', kind: 'prop', valueType: 'boolean' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      { key: 'onClick', kind: 'event' },
    ],
  },
];
