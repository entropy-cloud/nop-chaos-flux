import { Ellipse, Line, Text } from 'leafer-ui';
import { createCompositeGroup, createInstrumentSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaInstrumentGaugeType = 'scada-instrument-gauge';

/**
 * 仪表盘（I9.2）：表盘/指针/数值文本复合；指针旋转角 = 绑定值经量程换算
 * （bindings.rotation 的 scale 声明，applyScale 线性换算）驱动，label 文本经
 * formatValue 消费（bindings.text.format）。custom：min/max/startAngle/endAngle/unit（量程元信息）。
 */
export const scadaInstrumentGaugeDefinition = createInstrumentSymbol({
  type: scadaInstrumentGaugeType,
  name: 'Gauge',
  defaults: {
    x: 0,
    y: 0,
    width: 120,
    height: 120,
    fill: '#f5f5f5',
    stroke: '#37474f',
    strokeWidth: 2,
    textColor: '#212121',
    custom: { min: 0, max: 100, startAngle: -135, endAngle: 135, unit: '' },
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const radius = Math.min(width, height) / 2;
    const body = new Ellipse({
      name: 'body',
      x: width / 2,
      y: height / 2,
      width,
      height,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const needle = new Line({
      name: 'needle',
      x: width / 2,
      y: height / 2,
      points: [0, 0, 0, -radius * 0.72],
      stroke: '#d32f2f',
      strokeWidth: 3,
      strokeCap: 'round',
    }) as LeafNode;
    const label = new Text({
      name: 'label',
      x: 0,
      y: height / 2 + radius * 0.45,
      width,
      text: props.text ?? '',
      fontSize: 12,
      fill: props.textColor,
      textAlign: 'center',
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'needle', node: needle },
      { name: 'label', node: label },
    ]);
    // plan 2026-08-06-0900-2 P2-4：gauge 无 extent part，width/height 经 applyProps 回落此 hook，
    // 重算 body 表盘尺寸/中心 + needle 中心/points（量程半径）+ label 锚点/宽度。
    parts.resize = (key, value) => {
      setAttrs(body, { [key]: value });
      const w = (body as unknown as { width: number }).width;
      const h = (body as unknown as { height: number }).height;
      const r = Math.min(w, h) / 2;
      setAttrs(body, { x: w / 2, y: h / 2 });
      setAttrs(needle, { x: w / 2, y: h / 2, points: [0, 0, 0, -r * 0.72] });
      setAttrs(label, { y: h / 2 + r * 0.45, width: w });
    };
    return { root, parts };
  },
});
