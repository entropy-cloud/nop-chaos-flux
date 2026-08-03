import type { ActionSchema, BaseSchema, SchemaInput, SchemaObject } from '@nop-chaos/flux-core';

/**
 * `scada-canvas` renderer schema（契约：`docs/components/industrial-hmi/design-renderer.md` §4.1）。
 * 组态 JSON 内部类型（ScadaConfig/ScadaSymbolNode）随 I5.3 `serialization/config-types.ts`
 * 落定后收紧 `config` 类型并在本 barrel 再导出，骨架期以 SchemaObject 承接对象形态。
 */
export interface ScadaCanvasSchema extends BaseSchema {
  type: 'scada-canvas';
  /** 组态 JSON：内嵌字符串（JSON 文本）或对象（已解析）；支持表达式绑定（source-enabled） */
  config: string | SchemaObject;
  /** 画布尺寸（px）；缺省填满容器 */
  width?: number;
  height?: number;
  /** 加载态 region（config 尚未 resolve/校验中） */
  loading?: SchemaInput;
  /** 空态/错误态 region（config 非法或场景构建失败） */
  empty?: SchemaInput;
  /** 初始视口策略 */
  viewport?: { fit?: 'contain' | 'fill'; center?: boolean };
  /** 事件（schema 级） */
  events?: ScadaCanvasEvents;
}

export interface ScadaCanvasEvents extends SchemaObject {
  /** 图元点击（组态内图元事件声明之外的全局钩子） */
  onSymbolClick?: ActionSchema;
  onSymbolDblClick?: ActionSchema;
  onSymbolHover?: ActionSchema;
  /** 场景就绪（首帧渲染完成） */
  onReady?: ActionSchema;
  /** 场景错误（config 校验失败/构建失败） */
  onError?: ActionSchema;
}
