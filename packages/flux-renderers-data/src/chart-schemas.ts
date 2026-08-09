import type { BaseSchema, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'heatmap';

export interface ChartSeriesSchema {
  name?: string;
  type?: ChartType;
  data?: Array<number | { name?: string; value: number }>;
  dataRegionKey?: string;
  /** 双轴归属：映射到 `yAxis` 数组下标。缺省 0（默认左轴）。 */
  yAxisId?: number;
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

/** 多轴形态的单个 Y 轴定义（`yAxis` 为数组时启用双轴/多轴）。 */
export interface ChartYAxisSchema extends SchemaObject {
  /** 轴标签。 */
  label?: string;
  /** 轴位置。缺省按数组下标推导：index 0 → left，其余 → right。 */
  position?: 'left' | 'right';
}

export interface ChartSchema extends BaseSchema {
  type: 'chart';
  componentId?: string;
  chartType?: ChartType;
  title?: BaseSchema | BaseSchema[] | string;
  series?: SchemaValue;
  source?: SchemaValue;
  xAxis?: { dataKey?: string; label?: string };
  /** 单轴形态：`{ label?: string }`（向后兼容）；多轴形态：`ChartYAxisSchema[]`。 */
  yAxis?: { label?: string } | ChartYAxisSchema[];
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
  /** recharts Brush 数据缩放（按索引选区，仅 cartesian 类型）。 */
  brush?: boolean;
}
