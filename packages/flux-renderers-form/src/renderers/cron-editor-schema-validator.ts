import type { RendererSchemaValidationContext, BaseSchema } from '@nop-chaos/flux-core';
import { validateCronScheduleValue, type CronScheduleValue } from '../cron/index.js';
import { validateInputFieldSchema } from './input.js';
import type { CronEditorSchema } from '../schemas-cron.js';

/**
 * cron-editor 创作期 schema 校验（plan 540 M-2）：input 字段通用校验之外，
 * 对 schema.value 初值跑值对象级诊断（10 码），invalid-property-value error 级上报。
 * 运行期实时诊断由组件诊断区渲染（双通道不混用，design §3 注记）。
 */
export function validateCronEditorSchema(context: RendererSchemaValidationContext<BaseSchema>) {
  validateInputFieldSchema(context);
  const schema = context.schema as CronEditorSchema;
  if (!schema.value) return;
  const result = validateCronScheduleValue(schema.value as CronScheduleValue);
  if (result.code !== null) {
    context.emit({
      code: 'invalid-property-value',
      message: `cron-editor value diagnostic [${result.code}]: ${schema.value.cron}`,
      path: `${context.path}.value`,
      severity: 'error',
    });
  }
}
