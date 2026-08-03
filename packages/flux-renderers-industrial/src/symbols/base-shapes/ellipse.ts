import { Ellipse } from 'leafer-ui';
import type { ScadaSymbolDefinition } from '../symbol-types.js';
import { toShapeAttrs } from './common.js';

export const scadaEllipseType = 'scada-ellipse';

export const scadaEllipseDefinition: ScadaSymbolDefinition = {
  type: scadaEllipseType,
  name: 'Ellipse',
  category: 'shape',
  props: {
    x: { type: 'number' },
    y: { type: 'number' },
    width: { type: 'number' },
    height: { type: 'number' },
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
  defaults: { x: 0, y: 0, width: 100, height: 100, fill: '#ffffff' },
  create: ({ props }) => {
    const attrs = toShapeAttrs(props);
    if (attrs.width === undefined) attrs.width = 100;
    if (attrs.height === undefined) attrs.height = 100;
    return new Ellipse(attrs);
  },
};
