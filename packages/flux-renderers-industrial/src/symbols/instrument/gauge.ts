import { Ellipse, Line, Text } from 'leafer-ui';
import { createCompositeGroup, createInstrumentSymbol, setAttrs } from './common.js';
import { createDial, dialChildren, relayoutDial, type DialCustom } from './dial.js';
import type { LeafNode } from '../symbol-types.js';
import { INDUSTRIAL_TOKENS } from '../visuals.js';

export const scadaInstrumentGaugeType = 'scada-instrument-gauge';

/**
 * 仪表盘（I9.2，2026-08-15 商业级视觉刷新）：金属表圈 + 暗色渐变表盘 + 量程色带 +
 * 主/次刻度与刻度值（dial.ts）+ 带尾配重指针 + 数值文本。指针旋转角 = 绑定值经量程换算
 * （bindings.rotation 的 scale 声明，applyScale 线性换算）驱动，label 文本经
 * formatValue 消费（bindings.text.format）。custom：min/max/startAngle/endAngle/unit/zones。
 */
export const scadaInstrumentGaugeDefinition = createInstrumentSymbol({
  type: scadaInstrumentGaugeType,
  name: 'Gauge',
  defaults: {
    x: 0,
    y: 0,
    width: 120,
    height: 120,
    fill: '#90a4ae',
    stroke: '#37474f',
    strokeWidth: 2,
    textColor: '#eaf1fb',
    custom: { min: 0, max: 100, startAngle: -135, endAngle: 135, unit: '' },
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const body = new Ellipse({
      name: 'body',
      x: width / 2,
      y: height / 2,
      around: 'center',
      width,
      height,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const dial = createDial(props.custom as DialCustom | undefined);
    const needle = new Line({
      name: 'needle',
      x: width / 2,
      y: height / 2,
      points: [0, (Math.min(width, height) / 2) * 0.16, 0, -(Math.min(width, height) / 2) * 0.72],
      stroke: INDUSTRIAL_TOKENS.needle,
      strokeWidth: 3,
      strokeCap: 'round',
      shadow: { x: 1, y: 1, blur: 3, color: 'rgba(0,0,0,0.45)' },
    }) as LeafNode;
    const label = new Text({
      name: 'label',
      x: 0,
      y: height / 2 + (Math.min(width, height) / 2) * 0.45,
      width,
      text: props.text ?? '',
      fontSize: 13,
      fontWeight: 'bold',
      fontFamily: 'sans-serif',
      fill: props.textColor,
      textAlign: 'center',
    }) as LeafNode;
    relayoutDial(dial, width, height, props.custom as DialCustom | undefined);
    const hubTop = new Ellipse({
      name: 'hub-top',
      x: width / 2,
      y: height / 2 - (Math.min(width, height) / 2) * 0.03,
      around: 'center',
      width: (Math.min(width, height) / 2) * 0.06,
      height: (Math.min(width, height) / 2) * 0.06,
      fill: 'rgba(255,255,255,0.55)',
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      ...dialChildren(dial),
      { name: 'needle', node: needle },
      { name: 'dial-hub', node: dial.hub },
      { name: 'hub-top', node: hubTop },
      { name: 'label', node: label },
    ]);
    // plan 2026-08-06-0900-2 P2-4：gauge 无 extent part，width/height 经 applyProps 回落此 hook，
    // 重算 body 表圈尺寸/中心 + 表盘刻度族（dial relayout）+ needle 中心/points + label 锚点/宽度。
    parts.resize = (key, value) => {
      setAttrs(body, { [key]: value });
      const w = (body as unknown as { width: number }).width;
      const h = (body as unknown as { height: number }).height;
      const r = Math.min(w, h) / 2;
      setAttrs(body, { x: w / 2, y: h / 2 });
      relayoutDial(dial, w, h, props.custom as DialCustom | undefined);
      setAttrs(needle, { x: w / 2, y: h / 2, points: [0, r * 0.16, 0, -r * 0.72] });
      setAttrs(dial.hub, { x: w / 2, y: h / 2 });
      setAttrs(hubTop, { x: w / 2, y: h / 2 - r * 0.03, width: r * 0.06, height: r * 0.06 });
      setAttrs(label, { y: h / 2 + r * 0.45, width: w });
    };
    return { root, parts };
  },
});
