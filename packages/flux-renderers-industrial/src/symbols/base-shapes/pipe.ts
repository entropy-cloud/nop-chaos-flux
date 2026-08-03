import { Line } from 'leafer-ui';
import type { ScadaSymbolDefinition } from '../symbol-types.js';
import { toShapeAttrs } from './common.js';

export const scadaPipeType = 'scada-pipe';

export const scadaPipeDefinition: ScadaSymbolDefinition = {
  type: scadaPipeType,
  name: 'Pipe',
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
  defaults: { x: 0, y: 0, width: 100, height: 0, fill: '#3f7b5a', stroke: '#3f7b5a', strokeWidth: 6 },
  create: ({ props }) => {
    const attrs = toShapeAttrs(props);
    const width = (attrs.width as number | undefined) ?? 100;
    const height = (attrs.height as number | undefined) ?? 0;
    delete attrs.width;
    delete attrs.height;
    attrs.points = [0, 0, width, height];
    attrs.strokeCap = 'round';
    if (attrs.fill !== undefined && attrs.stroke === undefined) {
      attrs.stroke = attrs.fill;
    }
    return new Line(attrs);
  },
};
