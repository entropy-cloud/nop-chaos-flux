import { Ellipse, Rect } from 'leafer-ui';
import { createCompositeGroup, createDeviceSymbol, setAttrs } from './common.js';
import type { GeometryLeaf, LeafNode } from '../symbol-types.js';
import { glassShinePaint, INDUSTRIAL_TOKENS, liquidPaint } from '../visuals.js';

export const scadaDeviceTankType = 'scada-device-tank';

/**
 * 储罐（559 Phase 1，对标 ThingsBoard fluid system 罐符号）：立式圆柱罐体（顶/底椭球封头）+
 * 内胆液柱（extent：height 绑定驱动，y 锚定罐底）+ 玻璃高光条 + 支撑裙座 + label。
 * 液位通道与仪表族 level 同语义——bindings.height 的 scale 换算结果直接驱动液柱。
 */
export const scadaDeviceTankDefinition = createDeviceSymbol({
  type: scadaDeviceTankType,
  name: 'Tank',
  defaults: {
    x: 0,
    y: 0,
    width: 72,
    height: 104,
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const capHeight = Math.max(8, width * 0.2);
    const body = new Rect({
      name: 'body',
      x: 0,
      y: capHeight / 2,
      width,
      height: height - capHeight,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const roof = new Ellipse({
      name: 'roof',
      x: width / 2,
      y: capHeight / 2,
      around: 'center',
      width,
      height: capHeight,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const liquid = new Rect({
      name: 'liquid',
      x: 3,
      y: height - capHeight / 2,
      width: width - 6,
      height: 0,
      cornerRadius: 3,
      fill: liquidPaint(INDUSTRIAL_TOKENS.liquidTop, INDUSTRIAL_TOKENS.liquidBottom),
      opacity: 0.9,
    }) as LeafNode;
    const shine = new Rect({
      name: 'glass-shine',
      x: width * 0.08,
      y: capHeight,
      width: Math.max(4, width * 0.1),
      height: height - capHeight * 1.6,
      cornerRadius: 3,
      fill: glassShinePaint(),
    }) as LeafNode;
    const skirtL = new Rect({
      name: 'skirt-left',
      x: width * 0.12,
      y: height - capHeight / 2 - 2,
      width: width * 0.1,
      height: capHeight * 0.9,
      fill: INDUSTRIAL_TOKENS.steelDark,
    }) as LeafNode;
    const skirtR = new Rect({
      name: 'skirt-right',
      x: width * 0.78,
      y: height - capHeight / 2 - 2,
      width: width * 0.1,
      height: capHeight * 0.9,
      fill: INDUSTRIAL_TOKENS.steelDark,
    }) as LeafNode;
    const label = new Rect({
      name: 'label-plate',
      x: width / 2 - width * 0.16,
      y: height * 0.3,
      width: width * 0.32,
      height: Math.max(14, height * 0.12),
      cornerRadius: 2,
      fill: 'rgba(255,255,255,0.16)',
      stroke: 'rgba(255,255,255,0.28)',
      strokeWidth: 1,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'roof', node: roof },
      { name: 'liquid', node: liquid },
      { name: 'glass-shine', node: shine },
      { name: 'skirt-left', node: skirtL },
      { name: 'skirt-right', node: skirtR },
      { name: 'label-plate', node: label },
    ]);
    // width 几何变更重算罐壁/封头/液柱宽/高光/裙座/铭牌；height 是绑定驱动的液位（extent），不 resize 容器。
    parts.resize = (key, value) => {
      if (key !== 'width') return;
      setAttrs(body, { width: value });
      setAttrs(roof, { x: value / 2, width: value });
      setAttrs(liquid, { width: value - 6 });
      setAttrs(shine, { x: value * 0.08, width: Math.max(4, value * 0.1) });
      setAttrs(skirtL, { x: value * 0.12, width: value * 0.1 });
      setAttrs(skirtR, { x: value * 0.78, width: value * 0.1 });
      setAttrs(label, { x: value / 2 - value * 0.16, width: value * 0.32 });
    };
    return { root, parts };
  },
  applyProps: (_node, parts, props) => {
    if (typeof props.height !== 'number' || !parts.extent) return;
    const body = parts.body as GeometryLeaf;
    parts.extent.set({ y: body.y! + body.height! - props.height });
  },
});
