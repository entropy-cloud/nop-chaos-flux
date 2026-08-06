import { Ellipse, Rect } from 'leafer-ui';
import { createCompositeGroup, deviceRunRotateAnimation, createDeviceSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaDevicePumpType = 'scada-device-pump';

/** 泵（I9.1）：泵体/叶轮复合，开关状态形态切换（run 叶轮旋转 / stop 静止灰态），run/stop/fault 状态色。 */
export const scadaDevicePumpDefinition = createDeviceSymbol({
  type: scadaDevicePumpType,
  name: 'Pump',
  defaults: {
    x: 0,
    y: 0,
    width: 56,
    height: 56,
    animations: [deviceRunRotateAnimation],
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const body = new Rect({
      name: 'body',
      x: 0,
      y: 0,
      width,
      height,
      cornerRadius: width * 0.5,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const radius = Math.min(width, height) * 0.32;
    const impeller = new Ellipse({
      name: 'impeller',
      x: width / 2,
      y: height / 2,
      width: radius * 2,
      height: radius * 2,
      fill: '#26a69a',
      stroke: '#00695c',
      strokeWidth: 2,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'impeller', node: impeller },
    ]);
    // plan 2026-08-06-0900-2 P2-4：width/height 经 applyProps 回落此 hook，重算 body 容器（含 cornerRadius）+ impeller 中心/半径。
    parts.resize = (key, value) => {
      setAttrs(body, { [key]: value });
      const w = (body as unknown as { width: number }).width;
      const h = (body as unknown as { height: number }).height;
      setAttrs(body, { cornerRadius: w * 0.5 });
      const r = Math.min(w, h) * 0.32;
      setAttrs(impeller, { x: w / 2, y: h / 2, width: r * 2, height: r * 2 });
    };
    return { root, parts };
  },
});
