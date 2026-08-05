import type { ScadaConfig, ScadaSymbolNode } from './config-types.js';

export const rect = (id: string, overrides: Partial<ScadaSymbolNode> = {}): ScadaSymbolNode => ({
  id,
  type: 'scada-rect',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  ...overrides,
});

export const baseConfig = (overrides: Partial<ScadaConfig> = {}): ScadaConfig => ({
  version: 1,
  symbols: [rect('a'), rect('b', { x: 10, y: 20 })],
  ...overrides,
});
