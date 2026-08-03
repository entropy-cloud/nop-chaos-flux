import type { ScadaConfig } from './config-types.js';

export function parseScadaConfig(input: string | object): ScadaConfig {
  if (typeof input === 'string') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`invalid scada config JSON: ${message}`);
    }
    return shallowCopy(parsed);
  }
  return shallowCopy(input);
}

function shallowCopy(value: unknown): ScadaConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value as ScadaConfig;
  }
  const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  if (Array.isArray(copy.symbols)) copy.symbols = [...copy.symbols];
  if (Array.isArray(copy.variables)) copy.variables = [...copy.variables];
  return copy as unknown as ScadaConfig;
}
