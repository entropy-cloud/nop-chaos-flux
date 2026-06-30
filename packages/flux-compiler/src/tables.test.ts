import { describe, expect, it } from 'vitest';
import type {
  TemplateRegion,
  CompileSchemaOptions,
  SchemaInput,
  TemplateNode,
} from '@nop-chaos/flux-core';
import { DEEP_FIELD_NORMALIZERS } from './schema-compiler/tables.js';

function createMockCompileSchema(): (
  input: SchemaInput,
  options?: CompileSchemaOptions,
) => TemplateNode | TemplateNode[] {
  return (_input: SchemaInput, _options?: CompileSchemaOptions) =>
    ({ type: 'text', text: 'mock' }) as unknown as TemplateNode;
}

describe('DEEP_FIELD_NORMALIZERS', () => {
  describe('table.columns', () => {
    it('returns value unchanged when value is not an array', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.columns;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      expect(normalize({ value: 'not-array', path: '$', regions, compileSchema })).toBe(
        'not-array',
      );
      expect(normalize({ value: null, path: '$', regions, compileSchema })).toBeNull();
      expect(normalize({ value: 42, path: '$', regions, compileSchema })).toBe(42);
    });

    it('returns value unchanged when value is an empty array', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.columns;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const result = normalize({ value: [], path: '$', regions, compileSchema });
      expect(result).toEqual([]);
    });

    it('returns item unchanged when item is not an object', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.columns;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const result = normalize({
        value: ['string', 42, null, true],
        path: '$',
        regions,
        compileSchema,
      });
      expect(result).toEqual(['string', 42, null, true]);
    });

    it('preserves plain columns without schema regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.columns;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const columns = [
        { label: 'Name', name: 'name' },
        { label: 'Age', name: 'age' },
      ];

      const result = normalize({ value: columns, path: '$.columns', regions, compileSchema });
      expect(result).toEqual(columns);
    });

    it('extracts column label schema into regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.columns;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const columns = [{ label: { type: 'text', text: 'Dynamic Header' }, name: 'name' }];

      normalize({ value: columns, path: '$.columns', regions, compileSchema });

      expect(regions['columns.0.label']).toBeDefined();
      expect(regions['columns.0.label']?.key).toBe('columns.0.label');
    });

    it('extracts column cell schema into regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.columns;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const columns = [{ name: 'name', cell: { type: 'text', text: 'Cell ${$slot.record.name}' } }];

      normalize({ value: columns, path: '$.columns', regions, compileSchema });

      expect(regions['columns.0.cell']).toBeDefined();
      expect(regions['columns.0.cell']?.key).toBe('columns.0.cell');
    });

    it('extracts column buttons schema into regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.columns;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const columns = [{ label: 'Actions', buttons: { type: 'button', label: 'Edit' } }];

      normalize({ value: columns, path: '$.columns', regions, compileSchema });

      expect(regions['columns.0.buttons']).toBeDefined();
      expect(regions['columns.0.buttons']?.key).toBe('columns.0.buttons');
    });

    it('handles mixed columns with and without schema regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.columns;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const columns = [
        { label: 'Plain', name: 'plain' },
        { label: { type: 'text', text: 'Dynamic' }, name: 'dynamic' },
        { name: 'cell', cell: { type: 'text', text: 'Cell' } },
      ];

      normalize({ value: columns, path: '$.columns', regions, compileSchema });

      expect(regions['columns.0.label']).toBeUndefined();
      expect(regions['columns.1.label']).toBeDefined();
      expect(regions['columns.2.cell']).toBeDefined();
    });
  });

  describe('crud.columns', () => {
    it('extracts operation buttons into parameterized regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.crud.columns;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const columns = [
        {
          type: 'operation',
          label: 'Actions',
          buttons: [{ type: 'button', label: 'Inspect' }],
        },
      ];

      const result = normalize({ value: columns, path: '$.columns', regions, compileSchema }) as Array<
        Record<string, unknown>
      >;

      expect(result[0]?.buttons).toBeUndefined();
      expect(result[0]?.buttonsRegionKey).toBe('columns.0.buttons');
      expect(regions['columns.0.buttons']).toBeDefined();
      expect(regions['columns.0.buttons']?.params).toEqual(['record', 'index']);
    });
  });

  describe('tabs.items', () => {
    it('returns value unchanged when value is not an array', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.tabs.items;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      expect(normalize({ value: 'not-array', path: '$', regions, compileSchema })).toBe(
        'not-array',
      );
    });

    it('returns item unchanged when item is not an object', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.tabs.items;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const result = normalize({ value: ['string', null], path: '$', regions, compileSchema });
      expect(result).toEqual(['string', null]);
    });

    it('preserves plain items without schema regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.tabs.items;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const items = [
        { title: 'Tab 1', key: 'tab1' },
        { title: 'Tab 2', key: 'tab2' },
      ];

      const result = normalize({ value: items, path: '$', regions, compileSchema });
      expect(result).toEqual(items);
    });

    it('extracts tab title schema into regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.tabs.items;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const items = [{ title: { type: 'text', text: 'Dynamic Tab' }, key: 'tab1' }];

      normalize({ value: items, path: '$', regions, compileSchema });

      expect(regions['items.0.title']).toBeDefined();
      expect(regions['items.0.title']?.key).toBe('items.0.title');
      expect(regions['items.0.title']?.params).toEqual(['item', 'index', 'key']);
      expect(regions['items.0.title']?.isolate).toBeFalsy();
    });

    it('extracts tab body schema into regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.tabs.items;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const items = [{ title: 'Tab 1', body: { type: 'text', text: 'Content' }, key: 'tab1' }];

      normalize({ value: items, path: '$', regions, compileSchema });

      expect(regions['items.0.body']).toBeDefined();
      expect(regions['items.0.body']?.params).toEqual(['item', 'index', 'key']);
      expect(regions['items.0.body']?.isolate).toBeFalsy();
    });

    it('extracts tab toolbar schema into regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.tabs.items;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const items = [{ title: 'Tab 1', toolbar: { type: 'text', text: 'Tools' }, key: 'tab1' }];

      normalize({ value: items, path: '$', regions, compileSchema });

      expect(regions['items.0.toolbar']).toBeDefined();
      expect(regions['items.0.toolbar']?.params).toEqual(['item', 'index', 'key']);
      expect(regions['items.0.toolbar']?.isolate).toBeFalsy();
    });

    it('handles mixed items with and without schema regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.tabs.items;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const items = [
        { title: 'Plain', key: 'tab1' },
        {
          title: { type: 'text', text: 'Dynamic' },
          key: 'tab2',
          body: { type: 'text', text: 'Body' },
        },
      ];

      normalize({ value: items, path: '$', regions, compileSchema });

      expect(regions['items.0.title']).toBeUndefined();
      expect(regions['items.1.title']).toBeDefined();
      expect(regions['items.1.body']).toBeDefined();
    });
  });

  describe('table.expandable', () => {
    it('returns value unchanged when value is falsy', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.expandable;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      expect(normalize({ value: null, path: '$', regions, compileSchema })).toBeNull();
      expect(normalize({ value: undefined, path: '$', regions, compileSchema })).toBeUndefined();
      expect(normalize({ value: '', path: '$', regions, compileSchema })).toBe('');
    });

    it('returns value unchanged when value is an array', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.expandable;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();
      const arr = [{ a: 1 }];

      expect(normalize({ value: arr, path: '$', regions, compileSchema })).toBe(arr);
    });

    it('returns value unchanged when value is not an object', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.expandable;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      expect(normalize({ value: 42, path: '$', regions, compileSchema })).toBe(42);
    });

    it('extracts expandedRow schema into regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.expandable;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const expandable = { expandedRow: { type: 'text', text: 'Details ${record.id}' } };

      const result = normalize({
        value: expandable,
        path: '$.expandable',
        regions,
        compileSchema,
      }) as Record<string, unknown>;

      expect(regions['expandable.expandedRow']).toBeDefined();
      expect(regions['expandable.expandedRow']?.params).toEqual(['record', 'index']);
      expect(regions['expandable.expandedRow']?.isolate).toBe(true);
      expect(result.expandedRow).toBeUndefined();
      expect(result.expandedRowRegionKey).toBe('expandable.expandedRow');
    });

    it('preserves expandable object without expandedRow', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.expandable;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const expandable = { rowExpandable: '${record.active}' };

      const result = normalize({ value: expandable, path: '$', regions, compileSchema });

      expect(result).toEqual(expandable);
    });
  });

  describe('variant-field.variants', () => {
    it('returns value unchanged when value is not an array', () => {
      const normalize = DEEP_FIELD_NORMALIZERS['variant-field'].variants;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      expect(normalize({ value: 'not-array', path: '$', regions, compileSchema })).toBe(
        'not-array',
      );
      expect(normalize({ value: null, path: '$', regions, compileSchema })).toBeNull();
    });

    it('returns item unchanged when item is not an object', () => {
      const normalize = DEEP_FIELD_NORMALIZERS['variant-field'].variants;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const result = normalize({ value: ['string', 42, null], path: '$', regions, compileSchema });
      expect(result).toEqual(['string', 42, null]);
    });

    it('preserves items without match field', () => {
      const normalize = DEEP_FIELD_NORMALIZERS['variant-field'].variants;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const variants = [{ content: { type: 'text', text: 'Hello' } }];

      const result = normalize({ value: variants, path: '$', regions, compileSchema }) as any[];
      expect(result[0].content).toBeUndefined();
      expect(result[0].contentRegionKey).toBe('variants.0.content');
      expect(result[0].match).toBeUndefined();
    });

    it('preserves items where match is not an object', () => {
      const normalize = DEEP_FIELD_NORMALIZERS['variant-field'].variants;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const variants = [{ match: 'not-object' }];

      const result = normalize({ value: variants, path: '$', regions, compileSchema }) as any[];
      expect(result[0].match).toBe('not-object');
    });

    it('preserves items where match is an array', () => {
      const normalize = DEEP_FIELD_NORMALIZERS['variant-field'].variants;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const variants = [{ match: [{ kind: 'expression' }] }];

      const result = normalize({ value: variants, path: '$', regions, compileSchema }) as any[];
      expect(Array.isArray(result[0].match)).toBe(true);
    });

    it('preserves items where match.kind is not expression', () => {
      const normalize = DEEP_FIELD_NORMALIZERS['variant-field'].variants;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const variants = [{ match: { kind: 'static', when: 'hello' } }];

      const result = normalize({ value: variants, path: '$', regions, compileSchema }) as any[];
      expect(result[0].match).toEqual({ kind: 'static', when: 'hello' });
    });

    it('preserves items where match.when is not a string', () => {
      const normalize = DEEP_FIELD_NORMALIZERS['variant-field'].variants;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const variants = [{ match: { kind: 'expression', when: 42 } }];

      const result = normalize({ value: variants, path: '$', regions, compileSchema }) as any[];
      expect(result[0].match).toEqual({ kind: 'expression', when: 42 });
    });

    it('wraps expression match.when with __nopPreserveLiteral', () => {
      const normalize = DEEP_FIELD_NORMALIZERS['variant-field'].variants;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const variants = [
        { content: { type: 'text', text: 'Hello' }, match: { kind: 'expression', when: '${x === 1}' } },
      ];

      const result = normalize({ value: variants, path: '$', regions, compileSchema }) as any[];
      expect(result[0].match.when).toEqual({
        __nopPreserveLiteral: true,
        value: '${x === 1}',
      });
    });
  });
});
