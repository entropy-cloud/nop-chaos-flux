import type { ScadaSymbolDefinition, ScadaSymbolProps } from './symbol-types.js';

export function resolveSymbolStyle(
  definition: ScadaSymbolDefinition,
  instanceProps: ScadaSymbolProps,
  state?: string,
): ScadaSymbolProps {
  const merged: ScadaSymbolProps = { ...definition.defaults, ...instanceProps };
  if (!state) return merged;
  const patch = definition.resolveStateStyle
    ? definition.resolveStateStyle(merged, state)
    : (merged.states?.states?.[state]?.style ?? {});
  return { ...merged, ...patch };
}
