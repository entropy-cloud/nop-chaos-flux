import { Ellipse, Rect } from 'leafer-ui';
import { createCompositeGroup, deviceRunRotateAnimation, createDeviceSymbol } from './common.js';
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
      width: radius * 2,
      height: radius * 2,
      fill: '#ff9800',
      stroke: '#e65100',
      strokeWidth: 2,
    }) as LeafNode;
    return createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'rotor', node: rotor },
    ]);
  },
});
