import {
  scadaArrowDefinition,
  scadaEllipseDefinition,
  scadaLineDefinition,
  scadaPipeDefinition,
  scadaPolygonDefinition,
  scadaRectDefinition,
  scadaRoundRectDefinition,
  scadaTextDefinition,
} from './base-shapes/index.js';
import { hasScadaSymbol, registerScadaSymbol } from './symbol-registry.js';

export const builtinScadaSymbolDefinitions = [
  scadaRectDefinition,
  scadaRoundRectDefinition,
  scadaEllipseDefinition,
  scadaLineDefinition,
  scadaArrowDefinition,
  scadaPipeDefinition,
  scadaTextDefinition,
  scadaPolygonDefinition,
];

export function registerBuiltinScadaSymbols(): void {
  for (const definition of builtinScadaSymbolDefinitions) {
    if (!hasScadaSymbol(definition.type)) registerScadaSymbol(definition);
  }
}
