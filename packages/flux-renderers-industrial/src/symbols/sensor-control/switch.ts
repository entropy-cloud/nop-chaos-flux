import { Rect } from 'leafer-ui';
import { createCompositeGroup, createSensorControlSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaSensorControlSwitchType = 'scada-sensor-control-switch';

const LEVER_OFF_X = 3;

/**
 * 开关（I9.3）：底座/拨杆复合——拨杆位置由 `custom.on`（缺省 false）驱动
 * （on=右位/off=左位，交互外观静态区分，事件联动归 I11.1）；run/stop/fault 状态色。
 */
export const scadaSensorControlSwitchDefinition = createSensorControlSymbol({
  type: scadaSensorControlSwitchType,
  name: 'Switch',
  defaults: {
    width: 48,
    height: 28,
    custom: { on: false },
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
      cornerRadius: height / 2,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const lever = new Rect({
      name: 'core',
      x: 3,
      y: 3,
      width: height - 6,
      height: height - 6,
      cornerRadius: (height - 6) / 2,
      fill: '#ffffff',
      stroke: '#263238',
      strokeWidth: 1,
    }) as LeafNode;
    const isOn = props.custom?.on === true;
    lever.x = isOn ? width - height + 3 : 3;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: base },
      { name: 'core', node: lever },
    ]);
    // plan 2026-08-06-0900-2 P2-4：switch 无 extent part，width/height 经 applyProps 回落此 hook，
    // 重算 body 容器尺寸/cornerRadius + lever 尺寸/cornerRadius，并按当前 on/off 位态重定位 lever.x
    // （on/off 由 lever.x 是否等于 OFF 锚判定——applyProps(custom.on) 先于 resize 写 lever.x，resize 读其当前位态）。
    parts.resize = (key, value) => {
      setAttrs(base, { [key]: value });
      const w = (base as unknown as { width: number }).width;
      const h = (base as unknown as { height: number }).height;
      setAttrs(base, { cornerRadius: h / 2 });
      const onState = (lever as unknown as { x: number }).x !== LEVER_OFF_X;
      setAttrs(lever, {
        x: onState ? w - h + 3 : LEVER_OFF_X,
        width: h - 6,
        height: h - 6,
        cornerRadius: (h - 6) / 2,
      });
    };
    return { root, parts };
  },
  applyProps: (node, parts, props) => {
    if (!parts.core || typeof props.custom?.on !== 'boolean') return;
    const width = (parts.body as unknown as { width: number }).width;
    const height = (parts.body as unknown as { height: number }).height;
    parts.core.set({ x: props.custom.on ? width - height + 3 : 3 });
  },
});
