import { Ellipse, Rect } from 'leafer-ui';
import { createCompositeGroup, createSensorControlSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';
import type { ScadaStateDeclaration } from '../../serialization/config-types.js';

export const scadaSensorControlAlarmLightType = 'scada-sensor-control-alarm-light';

/** 警灯族状态（off=灰罩 / alarm=红罩+闪烁；布尔 true→alarm）。 */
const alarmLightStates: ScadaStateDeclaration = {
  states: {
    off: { style: { fill: '#78909c' } },
    alarm: { style: { fill: '#e53935' }, animations: [{ kind: 'blink', period: 400, from: 1, to: 0.25 }] },
  },
  booleanMap: { true: 'alarm', false: 'off' },
};

/**
 * 声光警灯（559 Phase 1，对标 FUXA 指示器/ThingsBoard 告警闪烁惯例）：
 * 底座 + 支柱 + 半球灯罩（body，状态色/闪烁）+ 光晕环（alarm 常显 halo 由状态 opacity 呈现）+ label。
 */
export const scadaSensorControlAlarmLightDefinition = createSensorControlSymbol({
  type: scadaSensorControlAlarmLightType,
  name: 'Alarm Light',
  defaults: {
    x: 0,
    y: 0,
    width: 44,
    height: 64,
    states: alarmLightStates,
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const baseW = width * 0.6;
    const baseH = height * 0.12;
    const body = new Ellipse({
      name: 'body',
      x: width / 2,
      y: height * 0.34,
      around: 'center',
      width: width * 0.72,
      height: width * 0.72,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const halo = new Ellipse({
      name: 'halo',
      x: width / 2,
      y: height * 0.34,
      around: 'center',
      width: width * 0.98,
      height: width * 0.98,
      stroke: 'rgba(229,57,53,0.4)',
      strokeWidth: 3,
    }) as LeafNode;
    const base = new Rect({
      name: 'base',
      x: width / 2 - baseW / 2,
      y: height * 0.62,
      width: baseW,
      height: baseH,
      cornerRadius: 2,
      fill: '#37474f',
      stroke: '#263238',
      strokeWidth: 1,
    }) as LeafNode;
    const mount = new Rect({
      name: 'mount',
      x: width / 2 - width * 0.3,
      y: height * 0.8,
      width: width * 0.6,
      height: height * 0.12,
      cornerRadius: 2,
      fill: '#455a64',
      stroke: '#263238',
      strokeWidth: 1,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'halo', node: halo },
      { name: 'base', node: base },
      { name: 'mount', node: mount },
    ]);
    parts.resize = (key, value) => {
      if (key !== 'width') return;
      setAttrs(body, { x: value / 2, width: value * 0.72, height: value * 0.72 });
      setAttrs(halo, { x: value / 2, width: value * 0.98, height: value * 0.98 });
      setAttrs(base, { x: value / 2 - value * 0.3, width: value * 0.6 });
      setAttrs(mount, { x: value / 2 - value * 0.3, width: value * 0.6 });
    };
    return { root, parts };
  },
});
