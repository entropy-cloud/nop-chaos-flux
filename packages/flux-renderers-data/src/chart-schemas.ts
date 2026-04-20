import type { BaseSchema, SchemaValue } from '@nop-chaos/flux-core';

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter';

export interface ChartSeriesSchema {
  name?: string;
  type?: ChartType;
  data?: Array<number | { name?: string; value: number }>;
  dataRegionKey?: string;
}

export interface ChartSchema extends BaseSchema {
  type: 'chart';
  componentId?: string;
  chartType?: ChartType;
  title?: string;
  series?: SchemaValue;
  source?: SchemaValue;
  xAxis?: { dataKey?: string; label?: string };
  yAxis?: { label?: string };
  height?: number | string;
  loading?: boolean;
  empty?: BaseSchema | BaseSchema[] | string;
}
