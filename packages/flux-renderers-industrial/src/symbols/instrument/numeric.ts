import { Rect, Text } from 'leafer-ui';
import { createCompositeGroup, createInstrumentSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';
import { linearPaint } from '../visuals.js';

export const scadaInstrumentNumericType = 'scada-instrument-numeric';

interface NumericState {
  unit: LeafNode;
  label: LeafNode;
}

const numericStates = new WeakMap<LeafNode, NumericState>();

/**
 * LED 数值显示器（559 Phase 1，对标 FUXA 控制仪表/指示仪表族）：
 * 暗色面板 + 荧光大号等宽数值（label 角色，`text` 绑定带 format 驱动）+ 右下角单位标签
 * （`custom.unit`）。量程换算/格式化由绑定声明（bindings.text 的 scale/format）消费。
 */
export const scadaInstrumentNumericDefinition = createInstrumentSymbol({
  type: scadaInstrumentNumericType,
  name: 'Numeric',
  defaults: {
    x: 0,
    y: 0,
    width: 120,
    height: 44,
    fill: '#101820',
    stroke: '#37474f',
    strokeWidth: 2,
    textColor: '#ffd54f',
    text: '0',
    textSize: 24,
    custom: { unit: '' },
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
      cornerRadius: 4,
      fill: linearPaint({ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, [
        { offset: 0, color: '#1a2634' },
        { offset: 1, color: props.fill as string },
      ]),
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const label = new Text({
      name: 'label',
      x: 6,
      y: height / 2 - height * 0.32,
      width: width - 12,
      height: height * 0.72,
      text: props.text ?? '0',
      fontSize: typeof props.textSize === 'number' ? props.textSize : 24,
      fontWeight: 'bold',
      fontFamily: 'monospace',
      fill: props.textColor,
      textAlign: 'right',
      verticalAlign: 'middle',
    }) as LeafNode;
    const unit = new Text({
      name: 'unit',
      x: 8,
      y: height - 14,
      width: width * 0.4,
      height: 12,
      text: typeof props.custom?.unit === 'string' ? props.custom.unit : '',
      fontSize: 10,
      fontFamily: 'sans-serif',
      fill: 'rgba(255,255,255,0.55)',
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'label', node: label },
      { name: 'unit', node: unit },
    ]);
    numericStates.set(root, { unit, label });
    parts.resize = (key, value) => {
      if (key !== 'width') return;
      setAttrs(body, { width: value });
      setAttrs(label, { width: value - 12 });
      setAttrs(unit, { width: value * 0.4 });
    };
    return { root, parts };
  },
  applyProps: (_node, parts, props) => {
    const state = numericStates.get(parts.root);
    if (!state) return;
    if (typeof props.custom?.unit === 'string') setAttrs(state.unit, { text: props.custom.unit });
    if (typeof props.textSize === 'number') setAttrs(state.label, { fontSize: props.textSize });
  },
});
