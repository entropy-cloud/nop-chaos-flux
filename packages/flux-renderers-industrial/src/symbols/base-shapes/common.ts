import type { ScadaSymbolProps } from '../symbol-types.js';

export function toShapeAttrs(props: ScadaSymbolProps): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const direct: Array<keyof ScadaSymbolProps> = [
    'x',
    'y',
    'width',
    'height',
    'rotation',
    'visible',
    'opacity',
    'fill',
    'stroke',
    'strokeWidth',
    'shadow',
    'text',
    'dashOffset',
  ];
  for (const key of direct) {
    const value = props[key];
    if (value !== undefined) out[key] = value;
  }
  if (props.scale !== undefined) {
    out.scaleX = props.scale;
    out.scaleY = props.scale;
  }
  if (props.strokeDash !== undefined) out.dashPattern = props.strokeDash;
  // fillStyle（渐变/纹理）透传 leafer 样式系统：对象=leafer paint，字符串=fill 字符串；优先于 fill 色值简写（I8.1）
  if (props.fillStyle !== undefined) out.fill = props.fillStyle;
  return out;
}
