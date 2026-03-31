import type { BaseSchema } from '@nop-chaos/flux-core';

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter';

export interface ChartSeriesSchema {
  name?: string;
  type?: ChartType;
  data?: Array<number | { name?: string; value: number }>;
  dataRegionKey?: string;
}

export interface ChartSchema extends BaseSchema {
  type: 'chart';
  chartType?: ChartType;
  title?: string;
  series?: any;
  source?: any;
  xAxis?: { dataKey?: string; label?: string };
  yAxis?: { label?: string };
  height?: number | string;
  loading?: boolean;
  empty?: BaseSchema | BaseSchema[] | string;
}
