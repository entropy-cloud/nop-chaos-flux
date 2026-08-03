import type { BaseSchema, SchemaValue } from '@nop-chaos/flux-core';

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area';

export interface ChartSeriesSchema {
  name?: string;
  type?: ChartType;
  data?: Array<number | { name?: string; value: number }>;
  dataRegionKey?: string;
}

export interface ChartReferenceLineSchema {
  value?: number;
  label?: string;
  color?: string;
  dashed?: boolean;
}

export interface ChartBandSchema {
  upper?: number;
  lower?: number;
  color?: string;
  opacity?: number;
}

export interface ChartMarkersSchema {
  dataKey?: string;
  indices?: number[];
  color?: string;
}

export interface ChartSchema extends BaseSchema {
  type: 'chart';
  componentId?: string;
  chartType?: ChartType;
  title?: BaseSchema | BaseSchema[] | string;
  series?: SchemaValue;
  source?: SchemaValue;
  xAxis?: { dataKey?: string; label?: string };
  yAxis?: { label?: string };
  height?: number | string;
  loading?: boolean;
  empty?: BaseSchema | BaseSchema[] | string;
  legend?: boolean;
  stacked?: boolean;
  grid?: boolean;
  colors?: string[];
  referenceLines?: SchemaValue;
  band?: SchemaValue;
  markers?: SchemaValue;
}
