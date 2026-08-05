import type { ActionSchema, BaseSchema, SchemaInput, SchemaValue } from '@nop-chaos/flux-core';

export type GraphLayout = 'flow' | 'hierarchy';
export type GraphOrientation = 'LR' | 'TB';
export type GraphLevel = 'info' | 'success' | 'warning' | 'danger';

/**
 * 运行期节点数据模型（design §4.1）。
 * `label` 是 labelField 缺省读取字段；`type` 是节点类型（搜索/分组用）；
 * `level` 是业务原始判别字段（如 trace 的 `error`），值经 levelMap 映射为语义级；
 * `data` 承载业务字段（node region 绑定 `node.data.*`）。
 */
export interface GraphNode {
  id: string;
  label?: string;
  type?: string;
  level?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GraphEdge {
  id?: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  animated?: boolean;
}

export interface GraphSchema extends BaseSchema {
  type: 'graph';
  label?: string;
  nodes: SchemaValue;
  edges: SchemaValue;
  layout?: GraphLayout;
  orientation?: GraphOrientation;
  labelField?: string;
  typeField?: string;
  levelField?: string;
  levelMap?: Record<string, string>;
  fitView?: boolean;
  zoomable?: boolean;
  pannable?: boolean;
  selectable?: boolean;
  searchable?: boolean;
  showControls?: boolean;
  minZoom?: number;
  maxZoom?: number;
  node?: SchemaInput;
  empty?: SchemaInput;
  onNodeClick?: ActionSchema;
  onNodeDoubleClick?: ActionSchema;
  onSelectionChange?: ActionSchema;
}

export const DEFAULT_LEVEL_MAP: Record<string, string> = {
  error: 'danger',
  policy_violation: 'danger',
  warning: 'warning',
  success: 'success',
  info: 'info',
};
