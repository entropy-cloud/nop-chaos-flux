import type { ScadaConfig } from './config-types.js';

export function serializeScadaConfig(config: ScadaConfig): string {
  const out: ScadaConfig = { ...config, version: 1 };
  return JSON.stringify(out, null, 2);
}
