import { Polygon } from 'leafer-ui';
import type { ScadaSymbolDefinition } from '../symbol-types.js';
import { toShapeAttrs } from './common.js';

export const scadaPolygonType = 'scada-polygon';

/**
 * 默认三角形几何（plan 2026-08-04-2243-2 D1）：create() 在节点无 `custom.points` 时消费，
 * 同时经 `defaultGeometryPoints` 暴露给 bounds 路径，使 fit/center 包围盒按此默认几何计算
 * 而非退化为 0 尺寸。导出以供单测与 bounds consumer 复核。
 */
export const DEFAULT_TRIANGLE = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 50, y: 86 },
];

export const scadaPolygonDefinition: ScadaSymbolDefinition = {
  type: scadaPolygonType,
  name: 'Polygon',
  category: 'shape',
  props: {
    x: { type: 'number' },
    y: { type: 'number' },
    rotation: { type: 'number' },
    scale: { type: 'number' },
    visible: { type: 'boolean' },
    opacity: { type: 'number' },
    fill: { type: 'string' },
    fillStyle: { type: 'any' },
    stroke: { type: 'string' },
    strokeWidth: { type: 'number' },
    strokeDash: { type: 'array' },
    dashOffset: { type: 'number' },
    shadow: { type: 'object' },
  },
  defaults: { x: 0, y: 0, fill: '#ffffff', stroke: '#000000', strokeWidth: 1 },
  create: ({ props }) => {
    const attrs = toShapeAttrs(props);
    const customPoints = props.custom?.points;
    attrs.points = Array.isArray(customPoints) ? customPoints : DEFAULT_TRIANGLE;
    return new Polygon(attrs);
  },
  defaultGeometryPoints: () => DEFAULT_TRIANGLE,
};
