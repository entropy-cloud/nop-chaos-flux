import { describe, it, expect } from 'vitest';
import { extractPanelFields, evaluateVisibleWhen } from './schema-extractor.js';
import type { ScadaSymbolDefinition } from '../../symbols/symbol-types.js';
import type { ScadaSymbolNode } from '../../serialization/config-types.js';

const rectDefinition: ScadaSymbolDefinition = {
  type: 'scada-rect',
  name: 'Rectangle',
  props: {
    x: { type: 'number' },
    y: { type: 'number' },
    width: { type: 'number' },
    height: { type: 'number' },
    fill: { type: 'string' },
    stroke: { type: 'string' },
    strokeWidth: { type: 'number' },
    visible: { type: 'boolean' },
    opacity: { type: 'number' },
  },
  defaults: { x: 0, y: 0, width: 100, height: 100, fill: '#ffffff' },
  create: () => ({}) as never,
};

const textDefinition: ScadaSymbolDefinition = {
  type: 'scada-text',
  name: 'Text',
  props: {
    x: { type: 'number' },
    y: { type: 'number' },
    text: { type: 'string', group: 'style', widget: 'textarea' },
    textColor: { type: 'string', group: 'style', widget: 'color-picker' },
    textSize: { type: 'number', group: 'style' },
    align: { type: 'string', group: 'style', widget: 'select', enum: ['left', 'center', 'right'] },
  },
  defaults: { x: 0, y: 0, text: '', textColor: '#000000', textSize: 14 },
  create: () => ({}) as never,
};

describe('extractPanelFields', () => {
  it('groups fields by geometry/style (inferred from key names)', () => {
    const groups = extractPanelFields(rectDefinition);
    const geometry = groups.find((g) => g.group === 'geometry');
    expect(geometry).toBeDefined();
    expect(geometry!.fields.map((f) => f.key)).toContain('x');
    expect(geometry!.fields.map((f) => f.key)).toContain('width');
    const style = groups.find((g) => g.group === 'style');
    expect(style).toBeDefined();
    expect(style!.fields.map((f) => f.key)).toContain('fill');
  });

  it('derives widget from type when widget not specified', () => {
    const groups = extractPanelFields(rectDefinition);
    const geometry = groups.find((g) => g.group === 'geometry')!;
    const xField = geometry.fields.find((f) => f.key === 'x')!;
    expect(xField.entry.widget).toBe('number-input');
    const visibleField = geometry.fields.find((f) => f.key === 'visible')!;
    expect(visibleField.entry.widget).toBe('switch');
  });

  it('respects explicit widget override', () => {
    const groups = extractPanelFields(textDefinition);
    const style = groups.find((g) => g.group === 'style')!;
    const textField = style.fields.find((f) => f.key === 'text')!;
    expect(textField.entry.widget).toBe('textarea');
    const colorField = style.fields.find((f) => f.key === 'textColor')!;
    expect(colorField.entry.widget).toBe('color-picker');
  });

  it('defaults from definition.defaults are authoritative', () => {
    const groups = extractPanelFields(rectDefinition);
    const geometry = groups.find((g) => g.group === 'geometry')!;
    const widthField = geometry.fields.find((f) => f.key === 'width')!;
    expect(widthField.defaultValue).toBe(100);
  });

  it('injects virtual fields (bindings/states/animations/events)', () => {
    const groups = extractPanelFields(rectDefinition);
    const binding = groups.find((g) => g.group === 'binding');
    expect(binding).toBeDefined();
    expect(binding!.fields.find((f) => f.key === 'bindings')).toBeDefined();
    const state = groups.find((g) => g.group === 'state');
    expect(state).toBeDefined();
    const animation = groups.find((g) => g.group === 'animation');
    expect(animation).toBeDefined();
    const event = groups.find((g) => g.group === 'event');
    expect(event).toBeDefined();
  });

  it('virtual fields have json-editor widget', () => {
    const groups = extractPanelFields(rectDefinition);
    const binding = groups.find((g) => g.group === 'binding')!;
    const bindingsField = binding.fields.find((f) => f.key === 'bindings')!;
    expect(bindingsField.entry.widget).toBe('json-editor');
  });

  it('group order is geometry → style → binding → state → animation → event', () => {
    const groups = extractPanelFields(rectDefinition);
    const groupOrder = groups.map((g) => g.group);
    expect(groupOrder).toEqual(['geometry', 'style', 'binding', 'state', 'animation', 'event']);
  });

  it('field order within group follows definition.props declaration order', () => {
    const groups = extractPanelFields(rectDefinition);
    const geometry = groups.find((g) => g.group === 'geometry')!;
    const keys = geometry.fields.map((f) => f.key);
    expect(keys.indexOf('x')).toBeLessThan(keys.indexOf('y'));
    expect(keys.indexOf('y')).toBeLessThan(keys.indexOf('width'));
  });
});

describe('evaluateVisibleWhen', () => {
  it('returns true when field has no visibleWhen', () => {
    const field = { key: 'x', entry: { type: 'number' as const, widget: 'number-input' as const }, defaultValue: 0 };
    const node = { id: 'n1', type: 'scada-rect' } as ScadaSymbolNode;
    expect(evaluateVisibleWhen(field, node)).toBe(true);
  });

  it('evaluates equals condition', () => {
    const field = {
      key: 'textColor',
      entry: {
        type: 'string' as const,
        widget: 'color-picker' as const,
        visibleWhen: { field: 'type', equals: 'scada-text' },
      },
      defaultValue: '#000000',
    };
    const textNode = { id: 'n1', type: 'scada-text' } as ScadaSymbolNode;
    const rectNode = { id: 'n2', type: 'scada-rect' } as ScadaSymbolNode;
    expect(evaluateVisibleWhen(field, textNode)).toBe(true);
    expect(evaluateVisibleWhen(field, rectNode)).toBe(false);
  });

  it('evaluates in condition', () => {
    const field = {
      key: 'flow',
      entry: {
        type: 'object' as const,
        widget: 'json-editor' as const,
        visibleWhen: { field: 'type', in: ['scada-pipe', 'scada-pipe-junction'] },
      },
      defaultValue: undefined,
    };
    const pipeNode = { id: 'n1', type: 'scada-pipe' } as ScadaSymbolNode;
    const rectNode = { id: 'n2', type: 'scada-rect' } as ScadaSymbolNode;
    expect(evaluateVisibleWhen(field, pipeNode)).toBe(true);
    expect(evaluateVisibleWhen(field, rectNode)).toBe(false);
  });
});
