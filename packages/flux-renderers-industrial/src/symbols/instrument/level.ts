import { Line, Rect, Text } from 'leafer-ui';
import { createCompositeGroup, createInstrumentSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';
import { glassShinePaint, INDUSTRIAL_TOKENS, liquidPaint } from '../visuals.js';

export const scadaInstrumentLevelType = 'scada-instrument-level';

/**
 * 液位计（I9.2，2026-08-15 商业级视觉刷新）：罐体/渐变液柱（顶部亮、底部深）/
 * 玻璃高光条/右侧刻度线复合。液柱高度 = 绑定值经量程换算（bindings.height 的 scale）
 * 驱动，y 锚定罐底；label 经 formatValue 消费。
 */
export const scadaInstrumentLevelDefinition = createInstrumentSymbol({
  type: scadaInstrumentLevelType,
  name: 'Level',
  defaults: {
    x: 0,
    y: 0,
    width: 60,
    height: 140,
    fill: '#ffffff',
    stroke: '#37474f',
    strokeWidth: 2,
    textColor: '#212121',
    custom: { min: 0, max: 100, unit: '' },
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
      cornerRadius: 6,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const liquid = new Rect({
      name: 'liquid',
      x: 2,
      y: height,
      width: width - 4,
      height: 0,
      cornerRadius: 4,
      fill: liquidPaint(INDUSTRIAL_TOKENS.liquidTop, INDUSTRIAL_TOKENS.liquidBottom),
      opacity: 0.92,
    }) as LeafNode;
    const shine = new Rect({
      name: 'glass-shine',
      x: 4,
      y: 6,
      width: Math.max(4, width * 0.12),
      height: height - 12,
      cornerRadius: 3,
      fill: glassShinePaint(),
    }) as LeafNode;
    const ticks: LeafNode[] = [];
    for (let i = 0; i <= 4; i++) {
      ticks.push(
        new Line({
          name: `grad-tick-${i}`,
          points: [width - 11, height * (1 - i / 4), width - 4, height * (1 - i / 4)],
          stroke: '#78909c',
          strokeWidth: 1,
        }) as LeafNode,
      );
    }
    const label = new Text({
      name: 'label',
      x: 0,
      y: height + 4,
      width,
      text: props.text ?? '',
      fontSize: 12,
      fontWeight: 'bold',
      fontFamily: 'sans-serif',
      fill: props.textColor,
      textAlign: 'center',
    }) as LeafNode;
    const result = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'liquid', node: liquid },
      { name: 'glass-shine', node: shine },
      ...ticks.map((node, index) => ({ name: `grad-tick-${index}`, node })),
      { name: 'label', node: label },
    ]);
    // plan 2026-08-08-1910-1 Phase 2（A11）：width 几何变更重算 body 罐宽 + liquid/shine/ticks 宽度
    // + label 宽度。height 是 binding 驱动的液位（extent 长度），不 resize 容器——避免几何/液位语义打架。
    result.parts.resize = (key, value) => {
      if (key !== 'width') return;
      setAttrs(body, { width: value });
      setAttrs(liquid, { width: value - 4 });
      setAttrs(shine, { width: Math.max(4, value * 0.12) });
      ticks.forEach((tick, i) => tick.set({ points: [value - 11, height * (1 - i / 4), value - 4, height * (1 - i / 4)] }));
      setAttrs(label, { width: value });
    };
    return result;
  },
  applyProps: (node, parts, props) => {
    if (typeof props.height !== 'number' || !parts.extent) return;
    const tankHeight = (parts.body as unknown as { height: number }).height;
    parts.extent.set({ y: tankHeight - props.height });
  },
});
