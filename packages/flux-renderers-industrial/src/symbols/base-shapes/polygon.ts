import { Polygon } from 'leafer-ui';
import type { ScadaSymbolDefinition } from '../symbol-types.js';
import { toShapeAttrs } from './common.js';

export const scadaPolygonType = 'scada-polygon';

const DEFAULT_TRIANGLE = [
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
};
