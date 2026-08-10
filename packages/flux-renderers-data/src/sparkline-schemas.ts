import type { BaseSchema, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';

/** 趋势方向。`up`/`down` 由首尾值比较推导（尾 > 首 = up），`neutral` 中性。 */
export type SparklineStatus = 'up' | 'down' | 'neutral';

/** 按趋势语义取色的颜色声明（`color: { status }` 形态）。 */
export interface SparklineColorSchema extends SchemaObject {
  /** 显式方向，覆盖由数据首尾值推导的方向。 */
  status: SparklineStatus;
}

export interface SparklineSchema extends BaseSchema {
  type: 'sparkline';
  /** 迷你趋势数据（`number[]`；也支持 `${expr}` 表达式解析出数组）。 */
  data?: SchemaValue;
  /** 画布宽度，缺省 120（sparkline 语义尺寸）。 */
  width?: number;
  /** 画布高度，缺省 32。 */
  height?: number;
  /** 静态颜色，或 `{ status }` 按趋势语义取 CSS 变量（涨/跌/中性）；缺省按数据首尾值推导方向取 CSS 变量。 */
  color?: string | SparklineColorSchema;
  /** 折线下方渐变填充，缺省 false。 */
  fill?: boolean;
  /** 贝塞尔平滑曲线，缺省 false（折线）。 */
  smooth?: boolean;
  /** 显式 Y 域下界；缺省数据极值。 */
  min?: number;
  /** 显式 Y 域上界；缺省数据极值。 */
  max?: number;
}
