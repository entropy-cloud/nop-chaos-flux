import type { ScadaSymbolDefinition } from './symbol-types.js';

const definitions = new Map<string, ScadaSymbolDefinition>();

export function registerScadaSymbol(
  definition: ScadaSymbolDefinition,
  options: { override?: boolean } = {},
): void {
  if (typeof definition.type !== 'string' || definition.type.trim() === '') {
    throw new Error('scada symbol definition requires a non-empty `type`');
  }
  if (typeof definition.create !== 'function') {
    throw new Error(`scada symbol definition [${definition.type}] requires a 'create' factory function`);
  }
  if (definition.props === null || typeof definition.props !== 'object' || Array.isArray(definition.props)) {
    throw new Error(`scada symbol definition [${definition.type}] requires a 'props' schema object`);
  }
  if (definitions.has(definition.type) && !options.override) {
    throw new Error(
      `scada symbol type [${definition.type}] is already registered (use { override: true } to replace)`,
    );
  }
  definitions.set(definition.type, definition);
}

export function unregisterScadaSymbol(type: string): boolean {
  return definitions.delete(type);
}

export function getScadaSymbolDefinition(type: string): ScadaSymbolDefinition | undefined {
  return definitions.get(type);
}

export function hasScadaSymbol(type: string): boolean {
  return definitions.has(type);
}

export function listScadaSymbols(): ScadaSymbolDefinition[] {
  return [...definitions.values()];
}

export function clearScadaSymbolRegistry(): void {
  definitions.clear();
}
