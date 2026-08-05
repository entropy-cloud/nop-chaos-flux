import { PointStore } from './point-store.js';
import { ReverseIndex } from './reverse-index.js';
import { DirtyCollector, RefreshPipeline } from './dirty-collector.js';
import type { ApplyAttrs } from './dirty-collector.js';
import type {
  ScadaPointDeclaration,
  ScadaStateDeclaration,
  ScadaSymbolNode,
} from '../serialization/config-types.js';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createDefaultEnv } from '@nop-chaos/flux-react';

export const expressionCompiler = createExpressionCompiler(createFormulaCompiler());
export const env = createDefaultEnv();
export const evalContext = { compiler: expressionCompiler, env };

export interface PipelineHarness {
  pointStore: PointStore;
  collector: DirtyCollector;
  pipeline: RefreshPipeline;
  applied: Array<Record<string, Record<string, unknown>>>;
}

export function createHarness(options?: {
  declarations?: ScadaPointDeclaration[];
  symbols?: ScadaSymbolNode[];
  getStates?: (symbolId: string) => ScadaStateDeclaration | undefined;
  onStateChange?: (payload: { symbolId: string; state: string }) => void;
  onError?: (code: string, message: string, error?: unknown) => void;
}): PipelineHarness {
  const pointStore = new PointStore();
  pointStore.loadDeclarations(
    options?.declarations ?? [
      { id: 'level', source: 'static', value: 10 },
      { id: 'speed', source: 'static', value: 100 },
      { id: 'mode', source: 'static', value: 'auto' },
    ],
  );
  const reverseIndex = new ReverseIndex(
    options?.symbols ?? [
      {
        id: 'pump-1',
        type: 'scada-rect',
        x: 0,
        y: 0,
        bindings: {
          fill: { expression: '${level > 50 ? \'#ff0000\' : \'#00ff00\'}' },
          rotation: { point: 'speed', scale: { k: 0.1 } },
        },
      },
    ],
    evalContext,
  );
  const collector = new DirtyCollector({ scheduleTick: () => () => {} });
  const applied: Array<Record<string, Record<string, unknown>>> = [];
  const pipeline = new RefreshPipeline({
    pointStore,
    reverseIndex,
    collector,
    compiler: expressionCompiler,
    env,
    getStates: options?.getStates,
    onStateChange: options?.onStateChange,
    onError: options?.onError,
  });
  return {
    pointStore,
    collector,
    pipeline,
    applied,
  };
}

export const harnessApply = (harness: PipelineHarness): ApplyAttrs => (attrs) => {
  harness.applied.push(attrs as Record<string, Record<string, unknown>>);
};
