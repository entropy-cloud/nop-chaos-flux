import { describe, expect, it } from 'vitest';
import type { RendererSchemaValidationContext } from '@nop-chaos/flux-core';
import { validateEChartsSchema } from '../echarts-schema-validation.js';

type Diagnostic = {
  code: string;
  message: string;
  path?: string;
  severity?: string;
};

function createValidationContext(schema: Record<string, unknown>, path = '$'): {
  context: RendererSchemaValidationContext;
  diagnostics: Diagnostic[];
} {
  const diagnostics: Diagnostic[] = [];
  const context = {
    schema: schema as RendererSchemaValidationContext['schema'],
    path,
    emit: (diagnostic: Diagnostic) => {
      diagnostics.push(diagnostic);
    },
  } as unknown as RendererSchemaValidationContext;
  return { context, diagnostics };
}

function codesOf(diagnostics: Diagnostic[]): string[] {
  return diagnostics.map((d) => d.code);
}

describe('validateEChartsSchema', () => {
  it('ignores non-echarts schemas', () => {
    const { context, diagnostics } = createValidationContext({ type: 'chart' });
    validateEChartsSchema(context);
    expect(diagnostics).toEqual([]);
  });

  it('emits no diagnostics for a minimal valid schema', () => {
    const { context, diagnostics } = createValidationContext({
      type: 'echarts',
      option: { series: [{ type: 'bar', data: [1, 2, 3] }] },
    });
    validateEChartsSchema(context);
    expect(diagnostics).toEqual([]);
  });

  it('emits no diagnostics for a fully specified valid schema', () => {
    const { context, diagnostics } = createValidationContext({
      type: 'echarts',
      option: { xAxis: { type: 'category' }, series: [{ type: 'line' }] },
      dataset: {
        source: '${salesData}',
        dimensions: ['product', '2015'],
      },
      renderer: 'svg',
      initOptions: { devicePixelRatio: 2 },
      theme: 'dark',
      notMerge: true,
      lazyUpdate: false,
      height: 320,
      componentId: 'sales-chart',
    });
    validateEChartsSchema(context);
    expect(diagnostics).toEqual([]);
  });

  it('warns when option is missing (renders explicit empty state)', () => {
    const { context, diagnostics } = createValidationContext({ type: 'echarts' });
    validateEChartsSchema(context);
    expect(codesOf(diagnostics)).toEqual(['invalid-property-shape']);
    expect(diagnostics[0].severity).toBe('warning');
  });

  it('emits a diagnostic when option is not a plain object or expression string', () => {
    for (const badOption of [42, true, [], null]) {
      const { context, diagnostics } = createValidationContext({
        type: 'echarts',
        option: badOption,
      });
      validateEChartsSchema(context);
      expect(codesOf(diagnostics)).toContain('invalid-property-shape');
    }
  });

  it('accepts an expression string as option (resolved at runtime)', () => {
    const { context, diagnostics } = createValidationContext({
      type: 'echarts',
      option: '${chartOption}',
    });
    validateEChartsSchema(context);
    expect(diagnostics).toEqual([]);
  });

  it('emits a diagnostic when renderer is not canvas or svg', () => {
    const { context, diagnostics } = createValidationContext({
      type: 'echarts',
      option: { series: [] },
      renderer: 'webgl',
    });
    validateEChartsSchema(context);
    expect(codesOf(diagnostics)).toEqual(['invalid-property-shape']);
  });

  it('emits a diagnostic when dataset is not an object', () => {
    const { context, diagnostics } = createValidationContext({
      type: 'echarts',
      option: { series: [] },
      dataset: '${rows}',
    });
    validateEChartsSchema(context);
    expect(codesOf(diagnostics)).toEqual(['invalid-property-shape']);
  });

  it('emits a diagnostic when dataset.source is missing or has an unsupported shape', () => {
    for (const badDataset of [{}, { dimensions: ['a'] }, { source: 42 }]) {
      const { context, diagnostics } = createValidationContext({
        type: 'echarts',
        option: { series: [] },
        dataset: badDataset,
      });
      validateEChartsSchema(context);
      expect(codesOf(diagnostics)).toContain('invalid-property-shape');
    }
  });

  it('accepts expression-string or static-array dataset.source', () => {
    for (const source of ['${salesData}', [{ product: 'A', value: 1 }]]) {
      const { context, diagnostics } = createValidationContext({
        type: 'echarts',
        option: { series: [] },
        dataset: { source },
      });
      validateEChartsSchema(context);
      expect(diagnostics).toEqual([]);
    }
  });

  it('emits a diagnostic when dimensions is not a string array', () => {
    const { context, diagnostics } = createValidationContext({
      type: 'echarts',
      option: { series: [] },
      dataset: { source: '${rows}', dimensions: ['a', 42] },
    });
    validateEChartsSchema(context);
    expect(codesOf(diagnostics)).toContain('invalid-property-shape');
  });

  it('emits a diagnostic when notMerge or lazyUpdate is not boolean', () => {
    const { context, diagnostics } = createValidationContext({
      type: 'echarts',
      option: { series: [] },
      notMerge: 'yes',
    });
    validateEChartsSchema(context);
    expect(codesOf(diagnostics)).toContain('invalid-property-shape');

    const { context: ctx2, diagnostics: diag2 } = createValidationContext({
      type: 'echarts',
      option: { series: [] },
      lazyUpdate: 1,
    });
    validateEChartsSchema(ctx2);
    expect(codesOf(diag2)).toContain('invalid-property-shape');
  });

  it('emits a diagnostic when height is not number or string', () => {
    const { context, diagnostics } = createValidationContext({
      type: 'echarts',
      option: { series: [] },
      height: true,
    });
    validateEChartsSchema(context);
    expect(codesOf(diagnostics)).toContain('invalid-property-shape');
  });

  it('emits a diagnostic when theme is not a string or object', () => {
    const { context, diagnostics } = createValidationContext({
      type: 'echarts',
      option: { series: [] },
      theme: 42,
    });
    validateEChartsSchema(context);
    expect(codesOf(diagnostics)).toContain('invalid-property-shape');
  });

  it('emits a diagnostic when initOptions is not an object', () => {
    const { context, diagnostics } = createValidationContext({
      type: 'echarts',
      option: { series: [] },
      initOptions: 'big',
    });
    validateEChartsSchema(context);
    expect(codesOf(diagnostics)).toContain('invalid-property-shape');
  });

  it('does not validate an events field in the skeleton plan (deferred to E2.1)', () => {
    const { context, diagnostics } = createValidationContext({
      type: 'echarts',
      option: { series: [] },
      events: { onClick: { action: 'toast' } },
    });
    validateEChartsSchema(context);
    expect(diagnostics).toEqual([]);
  });
});
