import { Ellipse, Rect } from 'leafer-ui';
import { createCompositeGroup, createDeviceSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';
import { INDUSTRIAL_TOKENS, linearPaint } from '../visuals.js';

export const scadaDeviceCheckValveType = 'scada-device-check-valve';

/**
 * 止回阀（559 Phase 1，对标 ThingsBoard 水止阀）：阀体鼓包 + 左右法兰 + 铰接阀碟（core）。
 * 开度参数 `custom.openRatio`（0=关阀碟竖直落座、1=全开阀碟顺流向摆开，缺省全开）；
 * run 状态色落在阀体鼓包。
 */
export const scadaDeviceCheckValveDefinition = createDeviceSymbol({
  type: scadaDeviceCheckValveType,
  name: 'Check Valve',
  defaults: {
    x: 0,
    y: 0,
    width: 64,
    height: 40,
    custom: { openRatio: 1 },
  },
  applyOptions: { rotationTarget: 'root' },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const body = new Ellipse({
      name: 'body',
      x: width / 2,
      y: height / 2,
      around: 'center',
      width: width * 0.56,
      height: height * 0.88,
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
      y: height * 0.18,
      width: flangeW,
      height: height * 0.64,
      cornerRadius: 2,
      fill: flangePaint,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const flangeR = new Rect({
      name: 'flange-right',
      x: width - flangeW,
      y: height * 0.18,
      width: flangeW,
      height: height * 0.64,
      cornerRadius: 2,
      fill: flangePaint,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const bore = new Rect({
      name: 'bore',
      x: 0,
      y: height / 2 - height * 0.1,
      width,
      height: height * 0.2,
      fill: INDUSTRIAL_TOKENS.steelDark,
      opacity: 0.55,
    }) as LeafNode;
    const seatW = width * 0.05;
    const core = new Rect({
      name: 'core',
      x: width / 2 + width * 0.05,
      y: height / 2 - height * 0.22,
      width: seatW,
      height: height * 0.44,
      cornerRadius: 1,
      fill: '#26a69a',
      stroke: '#00695c',
      strokeWidth: 1.5,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'flange-left', node: flangeL },
      { name: 'flange-right', node: flangeR },
      { name: 'bore', node: bore },
      { name: 'core', node: core },
    ]);
    parts.resize = (key, value) => {
      if (key === 'width') {
        setAttrs(body, { x: value / 2, width: value * 0.56 });
        const fw = Math.max(4, value * 0.08);
        setAttrs(flangeL, { x: 0, width: fw });
        setAttrs(flangeR, { x: value - fw, width: fw });
        setAttrs(bore, { width: value });
        setAttrs(core, { x: value / 2 + value * 0.05, width: value * 0.05 });
        return;
      }
      setAttrs(body, { y: value / 2, height: value * 0.88 });
      setAttrs(flangeL, { y: value * 0.18, height: value * 0.64 });
      setAttrs(flangeR, { y: value * 0.18, height: value * 0.64 });
      setAttrs(bore, { y: value / 2 - value * 0.1, height: value * 0.2 });
      setAttrs(core, { y: value / 2 - value * 0.22, height: value * 0.44 });
    };
    return { root, parts };
  },
  applyProps: (_node, parts, props) => {
    const ratio = props.custom?.openRatio;
    if (typeof ratio !== 'number' || !parts.core) return;
    // 铰点在阀碟顶缘：0=竖直落座（rotation 0），1=顺流向摆开约 70°。
    parts.core.set({ rotation: ratio * 70 });
  },
});
