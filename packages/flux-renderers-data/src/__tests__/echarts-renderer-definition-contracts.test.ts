import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { dataRendererDefinitions, echartsRendererDefinition, registerDataRenderers } from '../index.js';
import { validateEChartsSchema } from '../echarts-schema-validation.js';

describe('echarts renderer definition contracts', () => {
  it('registers an echarts renderer that coexists with chart', () => {
    const registry = createRendererRegistry();
    registerDataRenderers(registry);
    expect(typeof registry.get?.('echarts')).not.toBe('undefined');
    expect(typeof registry.get?.('chart')).not.toBe('undefined');
  });

  it('is part of the exported data renderer definitions', () => {
    expect(dataRendererDefinitions.some((def) => def.type === 'echarts')).toBe(true);
  });

  it('declares skeleton fields as prop channel with no event contracts (events land in E2.1)', () => {
    const fieldKinds = Object.fromEntries(
      (echartsRendererDefinition.fields ?? []).map((field) => [field.key, field.kind]),
    );
    for (const key of [
      'option',
      'dataset',
      'renderer',
      'initOptions',
      'theme',
      'notMerge',
      'lazyUpdate',
      'height',
      'componentId',
    ]) {
      expect(fieldKinds[key]).toBe('prop');
    }
    expect(echartsRendererDefinition.eventContracts).toBeUndefined();
    expect(echartsRendererDefinition.fields?.some((field) => field.kind === 'event')).toBe(false);
  });

  it('publishes the resize capability and enum/boolean prop contracts', () => {
    expect(echartsRendererDefinition.componentCapabilityContracts?.map((c) => c.handle)).toEqual([
      'resize',
    ]);
    expect(echartsRendererDefinition.propContracts?.renderer?.shape).toMatchObject({
      kind: 'union',
    });
    expect(echartsRendererDefinition.propContracts?.notMerge?.shape).toMatchObject({
      kind: 'boolean',
    });
    expect(echartsRendererDefinition.propContracts?.lazyUpdate?.shape).toMatchObject({
      kind: 'boolean',
    });
  });

  it('wires the schema validator so malformed echarts schemas emit diagnostics', () => {
    expect(typeof echartsRendererDefinition.schemaValidator).toBe('function');

    const diagnostics: Array<{ code: string }> = [];
    const context = {
      schema: { type: 'echarts', option: 42 },
      path: '$',
      emit: (diagnostic: { code: string }) => {
        diagnostics.push(diagnostic);
      },
    } as unknown as Parameters<
      NonNullable<typeof echartsRendererDefinition.schemaValidator>
    >[0];
    validateEChartsSchema(context);
    expect(diagnostics.map((d) => d.code)).toContain('invalid-property-shape');
  });
});
