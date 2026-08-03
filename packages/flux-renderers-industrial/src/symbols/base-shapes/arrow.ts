import { Line } from 'leafer-ui';
import type { ScadaSymbolDefinition } from '../symbol-types.js';
import { toShapeAttrs } from './common.js';

export const scadaArrowType = 'scada-arrow';

export const scadaArrowDefinition: ScadaSymbolDefinition = {
  type: scadaArrowType,
  name: 'Arrow',
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
    stroke: { type: 'string' },
    strokeWidth: { type: 'number' },
  },
  defaults: { x: 0, y: 0, width: 100, height: 0, stroke: '#000000', strokeWidth: 1 },
  create: ({ props }) => {
    const attrs = toShapeAttrs(props);
    const width = (attrs.width as number | undefined) ?? 100;
    const height = (attrs.height as number | undefined) ?? 0;
    delete attrs.width;
    delete attrs.height;
    attrs.points = [0, 0, width, height];
    attrs.endArrow = true;
    return new Line(attrs);
  },
};
