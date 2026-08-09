import { createDefaultEnv } from '@nop-chaos/flux-react';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { ScadaConfig } from '../serialization/config-types.js';

export const expressionCompiler = createExpressionCompiler(createFormulaCompiler());
export const env = createDefaultEnv();

export const bridgeConfig = (
  fluxDecls: Array<{ id: string; flux: string }>,
  symbols: ScadaConfig['symbols'] = [
    {
      id: 'rect-1',
      type: 'scada-rect',
      x: 0,
      y: 0,
      bindings: { fill: { expression: "${temp > 30 ? 'hot' : 'cool'}" } },
    },
  ],
): ScadaConfig =>
  ({
    version: 1,
    variables: fluxDecls.map((decl) => ({ ...decl, source: 'flux' })),
    symbols,
  }) as ScadaConfig;
