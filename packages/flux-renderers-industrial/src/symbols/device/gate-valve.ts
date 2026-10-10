import { Ellipse, Rect } from 'leafer-ui';
import { createCompositeGroup, createDeviceSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';
import { INDUSTRIAL_TOKENS, linearPaint } from '../visuals.js';

export const scadaDeviceGateValveType = 'scada-device-gate-valve';

/**
 * 闸阀（559 Phase 1，对标 ThingsBoard 立式轮阀）：阀体/左右法兰/阀盖/手轮 + 闸板（core）。
 * 开度参数 `custom.openRatio`（0=关闭闸板落座、1=全开闸板升入阀盖，缺省全开）——
 * 与既有 scada-device-valve 的旋转阀芯区分，闸板做线性升降。
 */
export const scadaDeviceGateValveDefinition = createDeviceSymbol({
  type: scadaDeviceGateValveType,
  name: 'Gate Valve',
  defaults: {
    x: 0,
    y: 0,
    width: 64,
    height: 56,
    custom: { openRatio: 1 },
  },
  applyOptions: { rotationTarget: 'root' },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const body = new Rect({
      name: 'body',
      x: 0,
      y: height * 0.38,
      width,
      height: height * 0.24,
      cornerRadius: 4,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const flangePaint = linearPaint({ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, [
      { offset: 0, color: INDUSTRIAL_TOKENS.steelLight },
      { offset: 1, color: INDUSTRIAL_TOKENS.steelMid },
    ]);
    const flangeW = Math.max(4, width * 0.08);
    const flangeL = new Rect({
      name: 'flange-left',
      x: 0,
      y: height * 0.3,
      width: flangeW,
      height: height * 0.4,
      cornerRadius: 2,
      fill: flangePaint,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const flangeR = new Rect({
      name: 'flange-right',
      x: width - flangeW,
      y: height * 0.3,
      width: flangeW,
      height: height * 0.4,
      cornerRadius: 2,
      fill: flangePaint,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const bonnet = new Rect({
      name: 'bonnet',
      x: width / 2 - width * 0.13,
      y: height * 0.12,
      width: width * 0.26,
      height: height * 0.28,
      cornerRadius: 2,
      fill: linearPaint({ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, [
        { offset: 0, color: INDUSTRIAL_TOKENS.steelMid },
        { offset: 1, color: INDUSTRIAL_TOKENS.steelDark },
      ]),
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const handwheel = new Ellipse({
      name: 'handwheel',
      x: width / 2,
      y: height * 0.1,
      around: 'center',
      width: width * 0.4,
      height: height * 0.2,
      stroke: '#ff8f00',
      strokeWidth: Math.max(2, height * 0.06),
    }) as LeafNode;
    const gateW = width * 0.14;
    const gateH = height * 0.3;
    const core = new Rect({
      name: 'core',
      x: width / 2 - gateW / 2,
      y: height * 0.35,
      width: gateW,
      height: gateH,
      cornerRadius: 1,
      fill: '#26a69a',
      stroke: '#00695c',
      strokeWidth: 1.5,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'flange-left', node: flangeL },
      { name: 'flange-right', node: flangeR },
      { name: 'bonnet', node: bonnet },
      { name: 'handwheel', node: handwheel },
      { name: 'core', node: core },
    ]);
    parts.resize = (key, value) => {
      if (key === 'width') {
        setAttrs(body, { width: value });
        const fw = Math.max(4, value * 0.08);
        setAttrs(flangeL, { x: 0, width: fw });
        setAttrs(flangeR, { x: value - fw, width: fw });
        setAttrs(bonnet, { x: value / 2 - value * 0.13, width: value * 0.26 });
        setAttrs(handwheel, { x: value / 2, width: value * 0.4 });
        setAttrs(core, { x: value / 2 - value * 0.07, width: value * 0.14 });
        return;
      }
      setAttrs(body, { y: value * 0.38, height: value * 0.24 });
      setAttrs(flangeL, { y: value * 0.3, height: value * 0.4 });
      setAttrs(flangeR, { y: value * 0.3, height: value * 0.4 });
      setAttrs(bonnet, { y: value * 0.12, height: value * 0.28 });
      setAttrs(handwheel, { y: value * 0.1, height: value * 0.2, strokeWidth: Math.max(2, value * 0.06) });
      setAttrs(core, { y: value * 0.35, height: value * 0.3 });
    };
    return { root, parts };
  },
  applyProps: (_node, parts, props) => {
    const ratio = props.custom?.openRatio;
    if (typeof ratio !== 'number' || !parts.core) return;
    const h = (parts.core as unknown as { height: number }).height;
    const baseY = h / 0.3 * 0.35;
    const travel = h * 0.9;
    parts.core.set({ y: baseY - ratio * travel });
  },
});
