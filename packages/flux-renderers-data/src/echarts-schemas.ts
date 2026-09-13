import type { BaseSchema, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';

/**
 * schema 级 dataset（裁决 A2）：`source` 一律为表达式绑定（数据由外部
 * data-source 加载到 scope），或静态数组字面量；列式对象等静态内联数据
 * 应写在 `option.dataset`（echarts 原生位置）。`transform` 语义随 E2.1
 * 数据映射一起落地，骨架阶段仅透传。
 */
export interface EChartsDatasetSchema extends SchemaObject {
  source: SchemaValue;
  dimensions?: string[];
  transform?: SchemaValue[];
}

export interface EChartsInitOptions extends SchemaObject {
  width?: number | string;
  height?: number | string;
  devicePixelRatio?: number;
  useDirtyRect?: boolean;
  locale?: string;
}

export interface EChartsSchema extends BaseSchema {
  type: 'echarts';
  componentId?: string;
  /** ECharts 原生 option（对象字面量，或解析为对象的表达式）。 */
  option?: SchemaValue;
  dataset?: EChartsDatasetSchema;
  renderer?: 'canvas' | 'svg';
  initOptions?: EChartsInitOptions;
  theme?: string | SchemaObject;
  notMerge?: boolean;
  lazyUpdate?: boolean;
  height?: number | string;
  /** 事件映射（on* 命名 → ECharts 原生事件），值为 ActionSchema；经 SchemaValue 宽化满足索引签名。 */
  events?: Record<string, SchemaValue>;
  empty?: BaseSchema | BaseSchema[] | string;
}
