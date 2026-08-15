import { Ellipse, Rect } from 'leafer-ui';
import { createCompositeGroup, createSensorControlSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaSensorControlIndicatorType = 'scada-sensor-control-indicator';

/**
 * 指示灯（I9.3，2026-08-15 商业级视觉刷新）：灯体/灯罩复合 + 金属灯圈 + 灯面高光——
 * state 样式落到灯罩（body），run/stop/fault 状态色 + fault 闪烁联动
 * （animator blink 消费，样式经 applyProps 路由）。
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
    const housing = new Rect({
      name: 'housing',
      x: 0,
      y: 0,
      width,
      height,
      cornerRadius: 6,
      fill: '#455a64',
      stroke: '#0f151a',
      strokeWidth: 1,
    }) as LeafNode;
    const lampD = height * 0.72;
    const lamp = new Ellipse({
      name: 'body',
      x: width / 2,
      y: height / 2,
      around: 'center',
      width: lampD,
      height: lampD,
      fill: props.fill,
      stroke: '#202a33',
      strokeWidth: Math.max(2, lampD * 0.09),
    }) as LeafNode;
    const shine = new Ellipse({
      name: 'lamp-shine',
      x: width / 2 - lampD * 0.18,
      y: height / 2 - lampD * 0.18,
      around: 'center',
      width: lampD * 0.32,
      height: lampD * 0.32,
      fill: 'rgba(255,255,255,0.45)',
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      // plan 2026-08-05-0653-2 Phase 3 (open P1-2)：housing 先绘作背景层，lamp 后绘于上层，
      // 状态色可见。`name:'body'` 在 lamp，applyCompositeProps 状态色路由（parts.body）不变。
      // z-order 不变量（回归测试锁定）：children[0]=housing、children[1]=body(lamp)。
      { name: 'housing', node: housing },
      { name: 'body', node: lamp },
      { name: 'lamp-shine', node: shine },
    ]);
    // plan 2026-08-06-0900-2 P2-4：indicator 无 extent part，width/height 经 applyProps 回落此 hook，
    // 重算 housing/lamp（body）/高光几何。
    parts.resize = (key, value) => {
      setAttrs(housing, { [key]: value });
      const w = (housing as unknown as { width: number }).width;
      const h = (housing as unknown as { height: number }).height;
      const d = h * 0.72;
      setAttrs(lamp, { x: w / 2, y: h / 2, width: d, height: d });
      setAttrs(shine, { x: w / 2 - d * 0.18, y: h / 2 - d * 0.18, width: d * 0.32, height: d * 0.32 });
    };
    return { root, parts };
  },
});
