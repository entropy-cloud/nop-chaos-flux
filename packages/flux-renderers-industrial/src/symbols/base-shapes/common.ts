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
  return out;
}
