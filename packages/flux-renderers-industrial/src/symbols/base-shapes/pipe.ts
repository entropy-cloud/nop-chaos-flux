import type { ScadaSymbolDefinition } from '../symbol-types.js';
import { createPointsGeometryShape } from './points-geometry-shape.js';

export const scadaPipeType = 'scada-pipe';

// WA-industrial-004 (plan 569): shared points-geometry factory; pipe adds
// fill/fillStyle props, its industrial green defaults, and the round-cap +
// fill→stroke create-time propagation.
export const scadaPipeDefinition: ScadaSymbolDefinition = createPointsGeometryShape({
  type: scadaPipeType,
  name: 'Pipe',
  defaultWidth: 100,
  defaultHeight: 0,
  extraProps: {
    fill: { type: 'string' },
    fillStyle: { type: 'any' },
  },
  extraDefaults: { fill: '#3f7b5a', stroke: '#3f7b5a', strokeWidth: 6 },
  decorateAttrs: (attrs) => {
    attrs.strokeCap = 'round';
    if (attrs.fill !== undefined && attrs.stroke === undefined) {
      attrs.stroke = attrs.fill;
    }
  },
});
