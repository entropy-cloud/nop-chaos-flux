import { Ellipse, Group, Rect } from 'leafer-ui';
import { createCompositeGroup, deviceRunRotateAnimation, createDeviceSymbol } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaDeviceFanType = 'scada-device-fan';

/** 风机（I9.1）：底座/扇叶复合，run 态扇叶旋转（animator rotate 驱动），run/stop/fault 状态色。 */
export const scadaDeviceFanDefinition = createDeviceSymbol({
  type: scadaDeviceFanType,
  name: 'Fan',
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
      cornerRadius: 8,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const radius = Math.min(width, height) * 0.32;
    const blades = new Group({ name: 'blades', x: width / 2, y: height / 2 }) as LeafNode;
    const bladeColors = ['#ffb300', '#fb8c00', '#ffb300', '#fb8c00'];
    for (let index = 0; index < 4; index++) {
      (blades as unknown as { add: (node: LeafNode) => void }).add(
        new Ellipse({
          name: `blade-${index + 1}`,
          x: radius * 0.45,
          y: 0,
          width: radius * 1.1,
          height: radius * 0.55,
          fill: bladeColors[index],
          stroke: '#e65100',
          strokeWidth: 1,
          rotation: index * 90,
        }) as LeafNode,
      );
    }
    return createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'blades', node: blades },
    ]);
  },
});
