import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { pivotRendererDefinitions } from './pivot-renderer-definitions.js';

export type {
  PivotDimension,
  PivotDimensionSchema,
  PivotAggregationType,
  PivotCellType,
  PivotIndicatorSchema,
  PivotTotalsSchema,
  PivotSortType,
  PivotSortRuleSchema,
  PivotFilterOperator,
  PivotFilterRuleSchema,
  PivotTotalsConfigSchema,
  PivotDataConfigSchema,
  PivotCornerTitleOnDimension,
  PivotTableSchema,
} from './schemas.js';

export { pivotRendererDefinitions } from './pivot-renderer-definitions.js';

export function registerPivotRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, pivotRendererDefinitions);
}
