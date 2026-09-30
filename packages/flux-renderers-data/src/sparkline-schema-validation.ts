import type { RendererSchemaValidationContext } from '@nop-chaos/flux-core';
import { appendToJsonPointer } from '@nop-chaos/flux-core';
import type { SparklineSchema } from './sparkline-schemas.js';

/**
 * `sparkline` schema validator：`data` 为字面量非数组时输出 warning（不抛错）。
 * `${expr}` 字符串是合法表达式形态，不告警；运行时仍会走 dev warn + 空占位降级
 * （Failure Path sparkline-empty）。
 */
export function validateSparklineSchema(context: RendererSchemaValidationContext): void {
  if (context.schema.type !== 'sparkline') {
    return;
  }
  const schema = context.schema as SparklineSchema;
  const { path, emit } = context;
  if (schema.data !== undefined && schema.data !== null && typeof schema.data !== 'string' && !Array.isArray(schema.data)) {
    emit({
      code: 'invalid-property-shape',
      severity: 'warning',
      path: appendToJsonPointer(path, 'data'),
      message: 'sparkline.data must be a number[] or an expression string when provided; rendering an empty sparkline.',
    });
  }
}
