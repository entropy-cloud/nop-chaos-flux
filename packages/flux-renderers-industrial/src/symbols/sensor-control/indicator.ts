import { Ellipse, Rect } from 'leafer-ui';
import { createCompositeGroup, createSensorControlSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaSensorControlIndicatorType = 'scada-sensor-control-indicator';

/**
 * 指示灯（I9.3）：灯体/灯罩复合——state 样式落到灯罩（body），
 * run/stop/fault 状态色 + fault 闪烁联动（animator blink 消费，样式经 applyProps 路由）。
 */
export const scadaSensorControlIndicatorDefinition = createSensorControlSymbol({
  type: scadaSensorControlIndicatorType,
  name: 'Indicator',
  defaults: {
    width: 56,
    height: 32,
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const lamp = new Ellipse({
      name: 'body',
      x: width / 2,
      y: height / 2,
      width: height * 0.72,
      height: height * 0.72,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const housing = new Rect({
      name: 'housing',
      x: 0,
      y: 0,
      width,
      height,
      cornerRadius: 6,
      fill: '#455a64',
      stroke: '#263238',
      strokeWidth: 1,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      // plan 2026-08-05-0653-2 Phase 3 (open P1-2)：子序 swap 为 [housing, lamp]——
      // leafer `Group` 后入子在上层渲染，原序 [lamp, housing] 使不透明 housing（#455a64，
      // 覆盖全 bounds）绘制在 lamp 之上，灯体被完全遮挡（Failure Paths `indicator-lamp-hidden`）。
      // swap 后 housing 先绘作背景层，lamp 后绘于上层，状态色可见。`name:'body'` 仍在 lamp，
      // applyCompositeProps 状态色路由（parts.body）不变。
      { name: 'housing', node: housing },
      { name: 'body', node: lamp },
    ]);
    // plan 2026-08-06-0900-2 P2-4：indicator 无 extent part，width/height 经 applyProps 回落此 hook，
    // 重算 housing 容器尺寸 + lamp（body）中心/尺寸（housing 非 named part，经闭包引用）。
    parts.resize = (key, value) => {
      setAttrs(housing, { [key]: value });
      const w = (housing as unknown as { width: number }).width;
      const h = (housing as unknown as { height: number }).height;
      setAttrs(lamp, { x: w / 2, y: h / 2, width: h * 0.72, height: h * 0.72 });
    };
    return { root, parts };
  },
});
