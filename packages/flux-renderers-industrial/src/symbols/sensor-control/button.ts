import { Ellipse, Rect } from 'leafer-ui';
import { createCompositeGroup, createSensorControlSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';
import { linearPaint } from '../visuals.js';

export const scadaSensorControlButtonType = 'scada-sensor-control-button';

/**
 * 按钮（I9.3，2026-08-15 商业级视觉刷新）：底座/按键复合 + 金属渐变按钮帽 + 高光点，
 * 静态交互外观（事件联动归 I11.1）+ run/stop/fault 状态色落在 body（底座）。
 */
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
      fill: linearPaint({ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, [
        { offset: 0, color: '#f8fafc' },
        { offset: 1, color: '#b9c6d2' },
      ]),
      stroke: '#7d8fa0',
      strokeWidth: 1,
      shadow: { x: 0, y: 1, blur: 1.5, color: 'rgba(0,0,0,0.3)' },
    }) as LeafNode;
    const shine = new Ellipse({
      name: 'cap-shine',
      x: width / 2,
      y: 3 + (height - 6) * 0.3,
      around: 'center',
      width: (width - 8) * 0.42,
      height: 3,
      fill: 'rgba(255,255,255,0.7)',
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: base },
      { name: 'cap', node: cap },
      { name: 'cap-shine', node: shine },
    ]);
    // plan 2026-08-06-0900-2 P2-4：button 无 extent part，width/height 经 applyProps 回落此 hook，
    // 重算 body 容器尺寸 + cap 宽高（保留 cap 内边距锚点 x=4/y=3）+ 高光条。
    parts.resize = (key, value) => {
      setAttrs(base, { [key]: value });
      const w = (base as unknown as { width: number }).width;
      const h = (base as unknown as { height: number }).height;
      setAttrs(cap, { width: w - 8, height: h - 6 });
      setAttrs(shine, { x: w / 2, y: 3 + (h - 6) * 0.3, width: (w - 8) * 0.42 });
    };
    return { root, parts };
  },
});
