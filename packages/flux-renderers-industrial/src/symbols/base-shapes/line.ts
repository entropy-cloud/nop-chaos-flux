import type { ScadaSymbolDefinition } from '../symbol-types.js';
import { createPointsGeometryShape } from './points-geometry-shape.js';

export const scadaLineType = 'scada-line';

// WA-industrial-004 (plan 569): the verbatim ×3 points-geometry skeleton
// (line/arrow/pipe) is assembled by the shared factory; per-shape deltas are
// the extra props/defaults/decorations below.
export const scadaLineDefinition: ScadaSymbolDefinition = createPointsGeometryShape({
  type: scadaLineType,
  name: 'Line',
  defaultWidth: 100,
  defaultHeight: 0,
});
