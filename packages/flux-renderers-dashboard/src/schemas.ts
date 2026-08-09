import type { BaseSchema, SchemaInput, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';

/**
 * dashboard 面板（网格坐标模型，design: docs/components/dashboard-editor/design.md）。
 *
 * 坐标模型单一来源：编辑态坐标（x/y/w/h 网格单位）→ 运行态渲染零转换（同构），
 * 编辑/运行共享同一 `DashboardPanelSchema`。
 */
export interface DashboardPanelSchema extends SchemaObject {
  /** 面板 id（同一布局内唯一；编辑态选区/undo diff 的稳定锚点）。 */
  id: string;
  /** 面板内容 renderer 类型（chart / table / stat-tile / iframe / html / text …）。 */
  type: string;
  /** 面板标题（运行时渲染 panel chrome 标题条，可选）。 */
  title?: string;
  /** 网格 x（0 起，单位 = 1 col）。 */
  x: number;
  /** 网格 y（0 起，单位 = 1 row）。 */
  y: number;
  /** 宽度（单位 = col 数）。 */
  w: number;
  /** 高度（单位 = row 数）。 */
  h: number;
  /** 面板内容 schema props（表达式可用，渲染时经 fragment 编译求值）。 */
  props?: SchemaValue;
  /** 数据绑定表达式（如 `${sales}`）：求值结果经 `data` 注入面板内容。 */
  source?: SchemaValue;
}

/** dashboard 布局 schema（运行态 + 编辑态共用；编辑态经 `dashboard-editor` type 消费）。 */
export interface DashboardLayoutSchema extends BaseSchema {
  type: 'dashboard';
  /** 面板列表（空 → empty slot）。 */
  panels?: DashboardPanelSchema[];
  /** 网格列数（缺省 12）。 */
  cols?: number;
  /** 行高 px（缺省 40）。 */
  rowHeight?: number;
  /** 面板间距 px（缺省 8）。 */
  gap?: number;
  /** 画布高度 px（缺省按面板内容推导）。 */
  height?: number;
  /** 空态 region（无面板时渲染）。 */
  empty?: SchemaInput;
}

export type { SchemaInput, SchemaValue };
