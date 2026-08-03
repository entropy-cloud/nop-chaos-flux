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
import {
  scadaDeviceFanDefinition,
  scadaDeviceMotorDefinition,
  scadaDevicePumpDefinition,
  scadaDeviceValveDefinition,
} from './device/index.js';
import {
  scadaInstrumentGaugeDefinition,
  scadaInstrumentLevelDefinition,
  scadaInstrumentProgressDefinition,
  scadaInstrumentThermometerDefinition,
} from './instrument/index.js';
import {
  scadaSensorControlButtonDefinition,
  scadaSensorControlIndicatorDefinition,
  scadaSensorControlSensorDefinition,
  scadaSensorControlSwitchDefinition,
} from './sensor-control/index.js';
import { scadaPipeJunctionDefinition } from './pipe/index.js';
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
  scadaDeviceMotorDefinition,
  scadaDevicePumpDefinition,
  scadaDeviceValveDefinition,
  scadaDeviceFanDefinition,
  scadaInstrumentGaugeDefinition,
  scadaInstrumentLevelDefinition,
  scadaInstrumentThermometerDefinition,
  scadaInstrumentProgressDefinition,
  scadaSensorControlSensorDefinition,
  scadaSensorControlIndicatorDefinition,
  scadaSensorControlSwitchDefinition,
  scadaSensorControlButtonDefinition,
  scadaPipeJunctionDefinition,
];

export function registerBuiltinScadaSymbols(): void {
  for (const definition of builtinScadaSymbolDefinitions) {
    if (!hasScadaSymbol(definition.type)) registerScadaSymbol(definition);
  }
}
