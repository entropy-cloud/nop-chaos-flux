import type { ScadaSymbolDefinition } from '../symbol-types.js';
import { createPointsGeometryShape } from './points-geometry-shape.js';

export const scadaArrowType = 'scada-arrow';

// WA-industrial-004 (plan 569): shared points-geometry factory; arrow adds
// the fill prop and the endArrow head decoration.
export const scadaArrowDefinition: ScadaSymbolDefinition = createPointsGeometryShape({
  type: scadaArrowType,
  name: 'Arrow',
  defaultWidth: 100,
  defaultHeight: 0,
  extraProps: { fill: { type: 'string' } },
  decorateAttrs: (attrs) => {
    attrs.endArrow = true;
  },
});
