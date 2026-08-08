import { Ellipse, Rect } from 'leafer-ui';
import { createCompositeGroup, deviceRunRotateAnimation, createDeviceSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaDeviceMotorType = 'scada-device-motor';

/** 电机（I9.1）：机座/转轴复合，run 态转轴旋转（animator rotate 驱动），run/stop/fault 状态色。 */
export const scadaDeviceMotorDefinition = createDeviceSymbol({
  type: scadaDeviceMotorType,
  name: 'Motor',
  defaults: {
    x: 0,
    y: 0,
    width: 64,
    height: 48,
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
      cornerRadius: 8,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const radius = Math.min(width, height) * 0.3;
    const rotor = new Ellipse({
      name: 'rotor',
      x: width / 2,
      y: height / 2,
      around: 'center',
      width: radius * 2,
      height: radius * 2,
      fill: '#ff9800',
      stroke: '#e65100',
      strokeWidth: 2,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'rotor', node: rotor },
    ]);
    // plan 2026-08-06-0900-2 P2-4：width/height 经 applyProps 回落此 hook，重算 body 容器 + rotor 中心/半径。
    parts.resize = (key, value) => {
      setAttrs(body, { [key]: value });
      const w = (body as unknown as { width: number }).width;
      const h = (body as unknown as { height: number }).height;
      const r = Math.min(w, h) * 0.3;
      setAttrs(rotor, { x: w / 2, y: h / 2, width: r * 2, height: r * 2 });
    };
    return { root, parts };
  },
});
