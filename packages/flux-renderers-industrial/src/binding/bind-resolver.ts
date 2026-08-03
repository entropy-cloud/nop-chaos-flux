import type { ScadaBinding, ScadaPrimitive } from '../serialization/config-types.js';

export interface BindResolverDeps {
  getPointValue: (pointId: string) => ScadaPrimitive | undefined;
  evaluate: (expression: string) => ScadaPrimitive | undefined;
}

export interface ResolvedBinding {
  property: string;
  value: unknown;
}

/** 可绑定属性集合（design-data-binding.md §4.2）。 */
export const BINDABLE_PROPERTIES = [
  'fill',
  'stroke',
  'strokeWidth',
  'opacity',
  'visible',
  'text',
  'textColor',
  'rotation',
  'x',
  'y',
  'width',
  'height',
  'flow',
] as const;

export type BindableProperty = (typeof BINDABLE_PROPERTIES)[number];

export function isBindableProperty(property: string): property is BindableProperty {
  return (BINDABLE_PROPERTIES as readonly string[]).includes(property);
}

/** 量程换算（FUXA TagScale 蓝本）：线性 y = k*x + b；表达式换算经 evaluate 求值。 */
export function applyScale(
  value: ScadaPrimitive,
  scale: ScadaBinding['scale'],
  evaluate?: (expression: string) => ScadaPrimitive | undefined,
): ScadaPrimitive {
  if (scale === undefined) return value;
  if ('expression' in scale) {
    if (!evaluate) return value;
    return evaluate(scale.expression) ?? value;
  }
  if (typeof value !== 'number') return value;
  const k = scale.k ?? 1;
  const b = scale.b ?? 0;
  return k * value + b;
}

/** 格式化（文本属性）：%s 字符串 / %d 取整 / %f 两位小数 / %% 转义百分号，其余原样输出。 */
export function formatValue(value: ScadaPrimitive, format: string): string {
  const numeric = typeof value === 'number' ? value : Number(value);
  let out = '';
  for (let index = 0; index < format.length; index++) {
    if (format[index] === '%' && index + 1 < format.length) {
      const spec = format[index + 1];
      if (spec === 's') {
        out += String(value);
        index++;
        continue;
      }
      if (spec === 'd') {
        out += String(Math.round(numeric));
        index++;
        continue;
      }
      if (spec === 'f') {
        out += String(numeric.toFixed(2));
        index++;
        continue;
      }
      if (spec === '%') {
        out += '%';
        index++;
        continue;
      }
    }
    out += format[index];
  }
  return out;
}

/**
 * 属性绑定解析（I6.2）：`ScadaBinding` 求值优先级 point → expression → map → scale → format；
 * 输出属性键限制在可绑定属性集合（§4.2）。
 */
export class BindResolver {
  constructor(private readonly deps: BindResolverDeps) {}

  resolveBinding(binding: ScadaBinding): unknown | undefined {
    let base: ScadaPrimitive | undefined;
    if (binding.point !== undefined) {
      base = this.deps.getPointValue(binding.point);
    } else if (binding.expression !== undefined) {
      base = this.deps.evaluate(binding.expression);
    }
    if (base === undefined) return undefined;
    let value: ScadaPrimitive = base;
    if (binding.map !== undefined) {
      const mapped = binding.map[String(value)];
      if (mapped !== undefined) value = mapped;
    }
    if (binding.scale !== undefined) {
      value = applyScale(value, binding.scale, this.deps.evaluate);
    }
    if (binding.format !== undefined) {
      value = formatValue(value, binding.format);
    }
    return value;
  }

  resolveBindings(bindings: Record<string, ScadaBinding>): ResolvedBinding[] {
    const out: ResolvedBinding[] = [];
    for (const [property, binding] of Object.entries(bindings)) {
      if (!isBindableProperty(property)) continue;
      const value = this.resolveBinding(binding);
      if (value !== undefined) out.push({ property, value });
    }
    return out;
  }
}
