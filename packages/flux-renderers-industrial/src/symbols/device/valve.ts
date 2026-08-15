import { Ellipse, Rect } from 'leafer-ui';
import { createCompositeGroup, createDeviceSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';
import { INDUSTRIAL_TOKENS, linearPaint } from '../visuals.js';

export const scadaDeviceValveType = 'scada-device-valve';

/**
 * 阀门（I9.1，2026-08-15 商业级视觉刷新）：阀体/阀芯开合形态 + 左右法兰 + 阀盖 +
 * 顶部手轮（闸阀语义）。开度参数 `custom.openRatio`（0=关闭 90°，1=全开 0°，缺省全开）；
 * run/stop/fault 状态色落在 body（阀体）；symbol 级 rotation 旋转整机（rotationTarget root）。
 */
export const scadaDeviceValveDefinition = createDeviceSymbol({
  type: scadaDeviceValveType,
  name: 'Valve',
  defaults: {
    x: 0,
    y: 0,
    width: 64,
    height: 32,
    custom: { openRatio: 1 },
  },
  applyOptions: { rotationTarget: 'root' },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const body = new Rect({
      name: 'body',
      x: 0,
      y: 0,
      width,
      height,
      cornerRadius: 6,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const flangePaint = linearPaint({ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, [
      { offset: 0, color: INDUSTRIAL_TOKENS.steelLight },
      { offset: 1, color: INDUSTRIAL_TOKENS.steelMid },
    ]);
    const flangeL = new Rect({
      name: 'flange-left',
      x: 0,
      y: height * 0.18,
      width: Math.max(4, width * 0.08),
      height: height * 0.64,
      cornerRadius: 2,
      fill: flangePaint,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const flangeR = new Rect({
      name: 'flange-right',
      x: width - Math.max(4, width * 0.08),
      y: height * 0.18,
      width: Math.max(4, width * 0.08),
      height: height * 0.64,
      cornerRadius: 2,
      fill: flangePaint,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const stem = new Rect({
      name: 'stem',
      x: width / 2 - width * 0.04,
      y: height * 0.08,
      width: width * 0.08,
      height: height * 0.5,
      fill: INDUSTRIAL_TOKENS.steelMid,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const bonnet = new Rect({
      name: 'bonnet',
      x: width / 2 - width * 0.16,
      y: height * 0.1,
      width: width * 0.32,
      height: height * 0.4,
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
      y: height * 0.08,
      around: 'center',
      width: width * 0.42,
      height: height * 0.24,
      stroke: '#ff8f00',
      strokeWidth: Math.max(2, height * 0.07),
    }) as LeafNode;
    const openRatio = typeof props.custom?.openRatio === 'number' ? props.custom.openRatio : 1;
    const core = new Rect({
      name: 'core',
      x: width / 2 - height * 0.22,
      y: height / 2 - height * 0.22,
      width: height * 0.44,
      height: height * 0.44,
      fill: '#26a69a',
      stroke: '#00695c',
      strokeWidth: 2,
      rotation: (1 - openRatio) * 90,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'flange-left', node: flangeL },
      { name: 'flange-right', node: flangeR },
      { name: 'stem', node: stem },
      { name: 'bonnet', node: bonnet },
      { name: 'handwheel', node: handwheel },
      { name: 'core', node: core },
    ]);
    // plan 2026-08-06-0900-2 P2-4：width/height 经 applyProps 回落此 hook，重算 body 容器 + 装饰件
    // （法兰/阀杆/阀盖/手轮）+ core 相对锚点（保留 openRatio rotation）。
    parts.resize = (key, value) => {
      setAttrs(body, { [key]: value });
      const w = (body as unknown as { width: number }).width;
      const h = (body as unknown as { height: number }).height;
      const flange = Math.max(4, w * 0.08);
      setAttrs(flangeL, { y: h * 0.18, width: flange, height: h * 0.64 });
      setAttrs(flangeR, { x: w - flange, y: h * 0.18, width: flange, height: h * 0.64 });
      setAttrs(stem, { x: w / 2 - w * 0.04, y: h * 0.08, width: w * 0.08, height: h * 0.5 });
      setAttrs(bonnet, { x: w / 2 - w * 0.16, y: h * 0.1, width: w * 0.32, height: h * 0.4 });
      setAttrs(handwheel, { x: w / 2, y: h * 0.08, width: w * 0.42, height: h * 0.24, strokeWidth: Math.max(2, h * 0.07) });
      setAttrs(core, {
        x: w / 2 - h * 0.22,
        y: h / 2 - h * 0.22,
        width: h * 0.44,
        height: h * 0.44,
      });
    };
    return { root, parts };
  },
  applyProps: (node, parts, props) => {
    const ratio = props.custom?.openRatio;
    if (typeof ratio === 'number' && parts.core) parts.core.set({ rotation: (1 - ratio) * 90 });
  },
});
