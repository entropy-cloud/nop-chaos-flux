import { Rect } from 'leafer-ui';
import { buildTerminals, createCompositeGroup, createElectricalSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaElecBreakerType = 'scada-elec-breaker';

/**
 * 断路器（559 Phase 1，对标 ThingsBoard HP 通用件控制盘 / FUXA Electrical）：
 * 底座 + 左右接线端子 + 触桥（core）。分合参数 `custom.closed`（缺省 true）——
 * 合闸触桥水平搭接两触头，分闸触桥绕左触头翻转 -35°；trip 状态经 states 覆盖（红闪）。
 */
export const scadaElecBreakerDefinition = createElectricalSymbol({
  type: scadaElecBreakerType,
  name: 'Breaker',
  defaults: {
    x: 0,
    y: 0,
    width: 72,
    height: 44,
    custom: { closed: true },
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const body = new Rect({
      name: 'body',
      x: width * 0.18,
      y: height * 0.3,
      width: width * 0.64,
      height: height * 0.4,
      cornerRadius: 3,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const { wireL, wireR, padL, padR } = buildTerminals(width, height, props.stroke);
    const contactL = new Rect({
      name: 'contact-left',
      x: width * 0.24,
      y: height * 0.44,
      width: width * 0.08,
      height: height * 0.12,
      fill: '#cfd8dc',
      stroke: '#263238',
      strokeWidth: 1,
    }) as LeafNode;
    const contactR = new Rect({
      name: 'contact-right',
      x: width * 0.68,
      y: height * 0.44,
      width: width * 0.08,
      height: height * 0.12,
      fill: '#cfd8dc',
      stroke: '#263238',
      strokeWidth: 1,
    }) as LeafNode;
    const closed = props.custom?.closed !== false;
    const core = new Rect({
      name: 'core',
      x: width * 0.26,
      y: height * 0.42,
      width: width * 0.48,
      height: height * 0.1,
      cornerRadius: 2,
      fill: '#00cc66',
      stroke: '#263238',
      strokeWidth: 1,
      rotation: closed ? 0 : -35,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'wire-left', node: wireL },
      { name: 'wire-right', node: wireR },
      { name: 'pad-left', node: padL },
      { name: 'pad-right', node: padR },
      { name: 'contact-left', node: contactL },
      { name: 'contact-right', node: contactR },
      { name: 'core', node: core },
    ]);
    parts.resize = (key, value) => {
      if (key !== 'width') return;
      setAttrs(body, { x: value * 0.18, width: value * 0.64 });
      setAttrs(wireL, {
        points: [0, height / 2, value * 0.14, height / 2],
      });
      setAttrs(wireR, { points: [value * 0.86, height / 2, value, height / 2] });
      setAttrs(padL, { x: value * 0.14 });
      setAttrs(padR, { x: value * 0.79 });
      setAttrs(contactL, { x: value * 0.24 });
      setAttrs(contactR, { x: value * 0.68 });
      setAttrs(core, { x: value * 0.26, width: value * 0.48 });
    };
    return { root, parts };
  },
  applyProps: (_node, parts, props) => {
    const closed = props.custom?.closed;
    if (closed === undefined || !parts.core) return;
    parts.core.set({ rotation: closed !== false ? 0 : -35 });
  },
});
