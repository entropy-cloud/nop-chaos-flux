import {
  scadaArrowDefinition,
  scadaEllipseDefinition,
  scadaImageDefinition,
  scadaLineDefinition,
  scadaPipeDefinition,
  scadaPolygonDefinition,
  scadaRectDefinition,
  scadaRoundRectDefinition,
  scadaTextDefinition,
  scadaVideoDefinition,
} from './base-shapes/index.js';
import { hasScadaSymbol, registerScadaSymbol } from './symbol-registry.js';
import { scadaGroupDefinition } from './compound.js';

export const builtinScadaSymbolDefinitions = [
  scadaRectDefinition,
  scadaRoundRectDefinition,
  scadaEllipseDefinition,
  scadaLineDefinition,
  scadaArrowDefinition,
  scadaPipeDefinition,
  scadaTextDefinition,
  scadaPolygonDefinition,
  scadaImageDefinition,
  scadaVideoDefinition,
  scadaGroupDefinition,
];

export function registerBuiltinScadaSymbols(): void {
  for (const definition of builtinScadaSymbolDefinitions) {
    if (!hasScadaSymbol(definition.type)) registerScadaSymbol(definition);
  }
}
