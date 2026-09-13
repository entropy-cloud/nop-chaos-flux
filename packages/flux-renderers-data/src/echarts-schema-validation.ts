import type { RendererSchemaValidationContext } from '@nop-chaos/flux-core';
import type { EChartsSchema } from './echarts-schemas.js';

function toJsonPointer(path: string, ...segments: Array<string | number>): string {
  const suffix = segments
    .map((segment) => (typeof segment === 'number' ? `/${segment}` : `/${segment}`))
    .join('');
  return `${path}${suffix}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/**
 * `echarts` schema 结构校验（裁决 A1：前端自有验证体系，无 XDef）。
 * 只做顶层字段形态防御；option 内部合法性由 TS 类型 + ECharts 运行时自身
 * 承担，渲染路径上的畸形数据降级为显式空态，不抛错。
 *
 * `events` 字段随 E2.1 事件桥接一起引入，骨架阶段不校验、不声明通道。
 */
export function validateEChartsSchema(context: RendererSchemaValidationContext): void {
  if (context.schema.type !== 'echarts') {
    return;
  }
  const schema = context.schema as EChartsSchema;
  const { path, emit } = context;

  if (schema.option === undefined) {
    emit({
      code: 'invalid-property-shape',
      severity: 'warning',
      path: toJsonPointer(path, 'option'),
      message:
        'echarts.option is missing; the renderer shows an explicit empty state until an option is provided.',
    });
  } else if (!isPlainObject(schema.option) && typeof schema.option !== 'string') {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'option'),
      message:
        'echarts.option must be an option object (or an expression string resolving to one) when provided.',
    });
  }

  if (schema.dataset !== undefined) {
    if (!isPlainObject(schema.dataset)) {
      emit({
        code: 'invalid-property-shape',
        path: toJsonPointer(path, 'dataset'),
        message: 'echarts.dataset must be an object when provided.',
      });
    } else {
      const { source, dimensions } = schema.dataset;
      if (typeof source !== 'string' && !Array.isArray(source)) {
        emit({
          code: 'invalid-property-shape',
          path: toJsonPointer(path, 'dataset', 'source'),
          message:
            'echarts.dataset.source must be an expression string or a static array of rows when provided.',
        });
      }
      if (dimensions !== undefined && !isStringArray(dimensions)) {
        emit({
          code: 'invalid-property-shape',
          path: toJsonPointer(path, 'dataset', 'dimensions'),
          message: 'echarts.dataset.dimensions must be an array of dimension names when provided.',
        });
      }
    }
  }

  if (schema.renderer !== undefined && schema.renderer !== 'canvas' && schema.renderer !== 'svg') {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'renderer'),
      message: 'echarts.renderer must be "canvas" or "svg" when provided.',
    });
  }

  if (schema.initOptions !== undefined && !isPlainObject(schema.initOptions)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'initOptions'),
      message: 'echarts.initOptions must be an object when provided.',
    });
  }

  if (
    schema.theme !== undefined &&
    typeof schema.theme !== 'string' &&
    !isPlainObject(schema.theme)
  ) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'theme'),
      message: 'echarts.theme must be a registered theme name or a theme object when provided.',
    });
  }

  if (schema.notMerge !== undefined && typeof schema.notMerge !== 'boolean') {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'notMerge'),
      message: 'echarts.notMerge must be a boolean when provided.',
    });
  }

  if (schema.lazyUpdate !== undefined && typeof schema.lazyUpdate !== 'boolean') {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'lazyUpdate'),
      message: 'echarts.lazyUpdate must be a boolean when provided.',
    });
  }

  if (schema.height !== undefined && typeof schema.height !== 'number' && typeof schema.height !== 'string') {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'height'),
      message: 'echarts.height must be a number or a CSS length string when provided.',
    });
  }
}
