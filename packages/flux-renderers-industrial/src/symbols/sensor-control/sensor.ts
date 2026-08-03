import { Ellipse, Rect } from 'leafer-ui';
import { createCompositeGroup, createSensorControlSymbol } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaSensorControlSensorType = 'scada-sensor-control-sensor';

/** 传感器（I9.3）：探测点/支杆复合，run/stop/fault 状态色 + fault 闪烁联动。 */
export const scadaSensorControlSensorDefinition = createSensorControlSymbol({
  type: scadaSensorControlSensorType,
  name: 'Sensor',
  defaults: {
    width: 32,
    height: 64,
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const stem = new Rect({
      name: 'body',
      x: 0,
      y: 0,
      width,
      height,
      cornerRadius: 4,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const probe = new Ellipse({
      name: 'probe',
      x: width / 2,
      y: 10,
      width: width * 0.6,
      height: width * 0.6,
      fill: '#26a69a',
      stroke: '#00695c',
      strokeWidth: 2,
    }) as LeafNode;
    return createCompositeGroup(props, [
      { name: 'body', node: stem },
      { name: 'probe', node: probe },
    ]);
  },
});
