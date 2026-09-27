/**
 * buildInspectorSchema 测试矩阵（S1 §8.1；QA.6 inspector 验收载体）。
 *
 * - **editableProps 全覆盖断言**：每个测试 definition 的 editableProps 键在生成
 *   schema 中无遗漏、无幻影（合规 definition 字段名集 === editableProps 键集）。
 * - **region/event 零泄漏**：region/event/reaction 键不出现在 inspector 字段集。
 * - editorType→控件直映 + shape 推导兜底 + 混合 union 降级 + adapter 覆盖位 + 无契约降级。
 */

import { describe, expect, it } from 'vitest';
import { resolveRendererAuthoringContract } from '@nop-chaos/flux-core';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import {
  buildInspectorSchema,
  deriveControlFromShape,
  INSPECTOR_ADAPTER_KEY,
  INSPECTOR_EDITOR_TYPE_KEY,
  INSPECTOR_EVENTS_KEY,
  INSPECTOR_RAW_JSON_FIELD,
  INSPECTOR_READONLY_KEY,
} from './inspector-schema.js';
import type { InspectorBuildOptions } from './inspector-schema.js';

function def(partial: Partial<RendererDefinition>): RendererDefinition {
  return { type: 'demo', ...partial } as RendererDefinition;
}

function propFields(contract: ReturnType<typeof resolveRendererAuthoringContract>, options?: InspectorBuildOptions) {
  const schema = buildInspectorSchema(contract, options) as { body: Record<string, unknown>[] };
  return schema.body.filter((field) => field.name !== INSPECTOR_RAW_JSON_FIELD);
}

const LAYOUT_DEF = def({
  type: 'flex',
  category: 'layout',
  defaultSchema: { type: 'flex', body: [] },
  propContracts: {
    direction: {
      shape: { kind: 'union', anyOf: [{ kind: 'literal', value: 'row' }, { kind: 'literal', value: 'col' }] },
      displayName: 'Direction',
      editorType: 'select',
      defaultValue: 'col',
    },
    gap: { shape: { kind: 'string' }, displayName: 'Gap', editorType: 'expression' },
    collapsible: { shape: { kind: 'boolean' }, displayName: 'Collapsible', editorType: 'switch', defaultValue: false },
    stickyAt: { shape: { kind: 'number' }, displayName: 'Sticky At', editorType: 'input-number' },
    note: { shape: { kind: 'string' }, displayName: 'Note', editorType: 'textarea' },
    schema: { shape: { kind: 'object', fields: {} }, displayName: 'Schema', editorType: 'json' },
  },
  eventContracts: {
    onToggle: { displayName: 'Toggle' },
  },
  fields: [
    { key: 'direction', kind: 'prop' },
    { key: 'gap', kind: 'prop' },
    { key: 'collapsible', kind: 'prop', valueType: 'boolean' },
    { key: 'stickyAt', kind: 'prop' },
    { key: 'note', kind: 'prop' },
    { key: 'schema', kind: 'prop' },
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'onToggle', kind: 'event' },
    { key: 'onRefresh', kind: 'reaction' },
  ],
});

describe('editableProps 全覆盖断言（QA.6 载体）', () => {
  it('generated field names === editableProps keys exactly (no missing, no phantom)', () => {
    const contract = resolveRendererAuthoringContract(LAYOUT_DEF);
    const names = propFields(contract).map((field) => field.name);
    expect(names.sort()).toEqual(Object.keys(contract.editableProps).sort());
  });

  it('coverage holds across every fixture definition in this matrix', () => {
    const fixtures = [
      LAYOUT_DEF,
      def({
        propContracts: {
          size: {
            shape: { kind: 'union', anyOf: [{ kind: 'literal', value: 'sm' }, { kind: 'literal', value: 'md' }, { kind: 'literal', value: 'lg' }] },
            displayName: 'Size',
          },
          count: { shape: { kind: 'number' }, displayName: 'Count' },
        },
      }),
      def({
        propContracts: {
          autoHeight: { shape: { kind: 'boolean' }, displayName: 'Auto Height' },
        },
      }),
    ];
    for (const fixture of fixtures) {
      const contract = resolveRendererAuthoringContract(fixture);
      const names = propFields(contract).map((field) => field.name);
      expect(names.sort()).toEqual(Object.keys(contract.editableProps).sort());
    }
  });

  it('every generated field name maps back to a declared editableProps key', () => {
    const contract = resolveRendererAuthoringContract(LAYOUT_DEF);
    const schema = buildInspectorSchema(contract) as { body: Record<string, unknown>[] };
    for (const field of schema.body) {
      expect(contract.editableProps[field.name as string]).toBeDefined();
    }
  });
});

describe('region/event 零泄漏（QA.6 载体）', () => {
  it('region keys never appear as inspector fields; routed events listed once', () => {
    const contract = resolveRendererAuthoringContract(LAYOUT_DEF);
    const schema = buildInspectorSchema(contract, { fieldRules: LAYOUT_DEF.fields }) as {
      body: Record<string, unknown>[];
      [key: string]: unknown;
    };
    const names = schema.body.map((field) => field.name);
    expect(names).not.toContain('body');
    expect(names).not.toContain('onToggle');
    expect(names).not.toContain('onRefresh');
    const events = schema[INSPECTOR_EVENTS_KEY] as { name: string }[];
    expect(events.map((event) => event.name).sort()).toEqual(['onRefresh', 'onToggle']);
  });

  it('propContracts discipline violation is contained: region/event keys registered as props are dropped', () => {
    const violation = def({
      propContracts: {
        label: { shape: { kind: 'string' }, displayName: 'Label' },
        body: { shape: { kind: 'unknown' }, displayName: 'Body' },
        onClick: { shape: { kind: 'unknown' }, displayName: 'Click' },
      },
      fields: [
        { key: 'label', kind: 'prop' },
        { key: 'body', kind: 'region', regionKey: 'body' },
        { key: 'onClick', kind: 'event' },
      ],
    });
    const contract = resolveRendererAuthoringContract(violation);
    const names = propFields(contract, { fieldRules: violation.fields }).map((field) => field.name);
    expect(names).toEqual(['label']);
    const schema = buildInspectorSchema(contract, { fieldRules: violation.fields }) as Record<string, unknown>;
    expect(((schema[INSPECTOR_EVENTS_KEY] as { name: string }[]).map((event) => event.name))).toEqual(['onClick']);
  });
});

describe('editorType→控件直映（S1 §8.1 内置缺省表）', () => {
  const contract = resolveRendererAuthoringContract(LAYOUT_DEF);

  function fieldOf(name: string, options?: InspectorBuildOptions): Record<string, unknown> {
    return propFields(contract, options).find((field) => field.name === name) as Record<string, unknown>;
  }

  it('select / switch / input-number / textarea / json direct mapping', () => {
    expect(fieldOf('direction')).toMatchObject({ type: 'select', label: 'Direction', value: 'col', options: [
      { label: 'row', value: 'row' },
      { label: 'col', value: 'col' },
    ] });
    expect(fieldOf('collapsible')).toMatchObject({ type: 'switch', value: false });
    expect(fieldOf('stickyAt')).toMatchObject({ type: 'input-number' });
    expect(fieldOf('note')).toMatchObject({ type: 'textarea' });
    expect(fieldOf('schema')).toMatchObject({ type: 'json' });
  });

  it('expression prop degrades to verbatim text input (no parse, no loss)', () => {
    expect(fieldOf('gap')).toMatchObject({ type: 'input' });
    expect(fieldOf('gap')[INSPECTOR_EDITOR_TYPE_KEY]).toBe('expression');
  });

  it('required flag and description flow into the form schema', () => {
    const required = resolveRendererAuthoringContract(
      def({ propContracts: { name: { shape: { kind: 'string' }, displayName: 'Name', required: true, description: 'The name' } } }),
    );
    expect(propFields(required)[0]).toMatchObject({ required: true, description: 'The name' });
  });

  it('controlAdapters override stamps the adapter marker', () => {
    const field = fieldOf('gap', {
      controlAdapters: {
        expression: { renderCell: () => null },
      },
    });
    expect(field[INSPECTOR_ADAPTER_KEY]).toBe('expression');
    expect(field[INSPECTOR_EDITOR_TYPE_KEY]).toBe('expression');
  });
});

describe('shape 推导兜底（editorType 缺失）', () => {
  function fieldsOfShape(shape: Parameters<typeof deriveControlFromShape>[0]) {
    return deriveControlFromShape(shape);
  }

  it('all-literal union → select with literal options', () => {
    const choice = fieldsOfShape({
      kind: 'union',
      anyOf: [{ kind: 'literal', value: 'sm' }, { kind: 'literal', value: 2 }],
    });
    expect(choice).toMatchObject({ control: 'select', readOnly: false });
    expect(choice.options).toEqual([
      { label: 'sm', value: 'sm' },
      { label: '2', value: 2 },
    ]);
  });

  it('mixed union → input with shape hint (never silently truncates)', () => {
    const choice = fieldsOfShape({
      kind: 'union',
      anyOf: [{ kind: 'literal', value: 'sm' }, { kind: 'literal', value: 'md' }, { kind: 'number' }],
    });
    expect(choice.control).toBe('input');
    expect(choice.shapeHint).toBe('"sm" | "md" | number');
    const contract = resolveRendererAuthoringContract(
      def({
        propContracts: {
          width: { shape: { kind: 'union', anyOf: [{ kind: 'literal', value: 'sm' }, { kind: 'number' }] }, displayName: 'Width' },
        },
      }),
    );
    const field = propFields(contract)[0];
    expect(field.type).toBe('input');
    expect(field.description).toContain('shape: "sm" | number');
  });

  it('boolean→switch, number→input-number, string→input, object/array/record→json', () => {
    expect(fieldsOfShape({ kind: 'boolean' }).control).toBe('switch');
    expect(fieldsOfShape({ kind: 'number' }).control).toBe('input-number');
    expect(fieldsOfShape({ kind: 'string' }).control).toBe('input');
    expect(fieldsOfShape({ kind: 'object', fields: {} }).control).toBe('json');
    expect(fieldsOfShape({ kind: 'array', item: { kind: 'unknown' } }).control).toBe('json');
    expect(fieldsOfShape({ kind: 'record', value: { kind: 'string' } }).control).toBe('json');
  });

  it('remaining kinds (literal/unknown/schema-definition) degrade to readonly display', () => {
    expect(fieldsOfShape({ kind: 'literal', value: 'fixed' })).toMatchObject({ control: 'json', readOnly: true });
    expect(fieldsOfShape({ kind: 'unknown' }).readOnly).toBe(true);
    const contract = resolveRendererAuthoringContract(
      def({ propContracts: { frozen: { shape: { kind: 'unknown' }, displayName: 'Frozen' } } }),
    );
    expect(propFields(contract)[0][INSPECTOR_READONLY_KEY]).toBe(true);
  });

  it('shape hints cover null and structural kinds via mixed unions', () => {
    const hint = fieldsOfShape({
      kind: 'union',
      anyOf: [{ kind: 'literal', value: 'a' }, { kind: 'null' }, { kind: 'record', value: { kind: 'string' } }],
    }).shapeHint;
    expect(hint).toBe('"a" | null | record');
    const objectHint = fieldsOfShape({
      kind: 'union',
      anyOf: [{ kind: 'object', fields: {} }, { kind: 'array', item: { kind: 'unknown' } }],
    }).shapeHint;
    expect(objectHint).toBe('object | array');
    const scalarHint = fieldsOfShape({
      kind: 'union',
      anyOf: [{ kind: 'string' }, { kind: 'boolean' }, { kind: 'number' }],
    }).shapeHint;
    expect(scalarHint).toBe('string | boolean | number');
  });

  it('empty union falls back to free input without options', () => {
    const choice = fieldsOfShape({ kind: 'union', anyOf: [] });
    expect(choice.control).toBe('input');
    expect(choice.options).toBeUndefined();
  });

  it('unknown non-builtin editorType falls back to shape derivation', () => {
    const contract = resolveRendererAuthoringContract(
      def({ propContracts: { weird: { shape: { kind: 'boolean' }, displayName: 'Weird', editorType: 'future-control' } } }),
    );
    const field = propFields(contract)[0];
    expect(field.type).toBe('switch');
    expect(field[INSPECTOR_EDITOR_TYPE_KEY]).toBe('shape:boolean');
  });
});

describe('无 propContracts 降级', () => {
  it('degrades to raw JSON editing, not a blank panel', () => {
    const contract = resolveRendererAuthoringContract(def({}));
    expect(Object.keys(contract.editableProps)).toEqual([]);
    const schema = buildInspectorSchema(contract) as { body: Record<string, unknown>[] };
    expect(schema.body.length).toBe(1);
    expect(schema.body[0]).toMatchObject({ name: INSPECTOR_RAW_JSON_FIELD, type: 'json' });
    expect(schema.body[0][INSPECTOR_READONLY_KEY]).toBeUndefined();
  });
});
