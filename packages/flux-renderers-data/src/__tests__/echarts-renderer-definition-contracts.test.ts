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

  it('declares skeleton fields plus E2.1 events/empty channels', () => {
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
    expect(fieldKinds.events).toBe('prop');
    expect(fieldKinds.empty).toBe('value-or-region');
  });

  it('publishes event contracts for the nine native echarts event keys', () => {
    const contracts = echartsRendererDefinition.eventContracts ?? {};
    const expected = [
      'onClick',
      'onDblClick',
      'onMouseOver',
      'onMouseOut',
      'onMouseDown',
      'onMouseUp',
      'onContextMenu',
      'onDataZoom',
      'onLegendSelectChanged',
    ];
    expect(Object.keys(contracts).sort()).toEqual([...expected].sort());
    for (const key of expected) {
      expect((contracts as Record<string, { payload?: unknown }>)[key]?.payload).toEqual({
        kind: 'unknown',
      });
    }
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
