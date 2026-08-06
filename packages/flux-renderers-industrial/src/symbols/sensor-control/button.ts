import { Rect } from 'leafer-ui';
import { createCompositeGroup, createSensorControlSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaSensorControlButtonType = 'scada-sensor-control-button';

/** 按钮（I9.3）：底座/按键复合——静态交互外观（事件联动归 I11.1）+ run/stop/fault 状态色。 */
export const scadaSensorControlButtonDefinition = createSensorControlSymbol({
  type: scadaSensorControlButtonType,
  name: 'Button',
  defaults: {
    width: 56,
    height: 28,
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const base = new Rect({
      name: 'body',
      x: 0,
      y: 0,
      width,
      height,
      cornerRadius: 6,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const cap = new Rect({
      name: 'cap',
      x: 4,
      y: 3,
      width: width - 8,
      height: height - 6,
      cornerRadius: 4,
      fill: '#eceff1',
      stroke: '#90a4ae',
      strokeWidth: 1,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: base },
      { name: 'cap', node: cap },
    ]);
    // plan 2026-08-06-0900-2 P2-4：button 无 extent part，width/height 经 applyProps 回落此 hook，
    // 重算 body 容器尺寸 + cap 宽高（保留 cap 内边距锚点 x=4/y=3）。
    parts.resize = (key, value) => {
      setAttrs(base, { [key]: value });
      const w = (base as unknown as { width: number }).width;
      const h = (base as unknown as { height: number }).height;
      setAttrs(cap, { width: w - 8, height: h - 6 });
    };
    return { root, parts };
  },
});
