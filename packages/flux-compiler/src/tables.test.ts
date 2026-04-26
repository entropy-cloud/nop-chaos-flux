import { describe, expect, it } from 'vitest';
import type { TemplateRegion, CompileSchemaOptions, SchemaInput, TemplateNode } from '@nop-chaos/flux-core';
import { DEEP_FIELD_NORMALIZERS } from './schema-compiler/tables';

function createMockCompileSchema(): (input: SchemaInput, options?: CompileSchemaOptions) => TemplateNode | TemplateNode[] {
  return (_input: SchemaInput, _options?: CompileSchemaOptions) => ({ type: 'text', text: 'mock' } as unknown as TemplateNode);
}

describe('DEEP_FIELD_NORMALIZERS', () => {
  describe('table.columns', () => {
    it('returns value unchanged when value is not an array', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.columns;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      expect(normalize({ value: 'not-array', path: '$', regions, compileSchema })).toBe('not-array');
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

      const result = normalize({ value: ['string', 42, null, true], path: '$', regions, compileSchema });
      expect(result).toEqual(['string', 42, null, true]);
    });

    it('preserves plain columns without schema regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.columns;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const columns = [
        { label: 'Name', name: 'name' },
        { label: 'Age', name: 'age' }
      ];

      const result = normalize({ value: columns, path: '$.columns', regions, compileSchema });
      expect(result).toEqual(columns);
    });

    it('extracts column label schema into regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.columns;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const columns = [
        { label: { type: 'text', text: 'Dynamic Header' }, name: 'name' }
      ];

      normalize({ value: columns, path: '$.columns', regions, compileSchema });

      expect(regions['columns.0.label']).toBeDefined();
      expect(regions['columns.0.label']?.key).toBe('columns.0.label');
    });

    it('extracts column cell schema into regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.columns;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const columns = [
        { name: 'name', cell: { type: 'text', text: 'Cell ${record.name}' } }
      ];

      normalize({ value: columns, path: '$.columns', regions, compileSchema });

      expect(regions['columns.0.cell']).toBeDefined();
      expect(regions['columns.0.cell']?.key).toBe('columns.0.cell');
    });

    it('extracts column buttons schema into regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.table.columns;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const columns = [
        { label: 'Actions', buttons: { type: 'button', label: 'Edit' } }
      ];

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
        { name: 'cell', cell: { type: 'text', text: 'Cell' } }
      ];

      normalize({ value: columns, path: '$.columns', regions, compileSchema });

      expect(regions['columns.0.label']).toBeUndefined();
      expect(regions['columns.1.label']).toBeDefined();
      expect(regions['columns.2.cell']).toBeDefined();
    });
  });

  describe('tabs.items', () => {
    it('returns value unchanged when value is not an array', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.tabs.items;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      expect(normalize({ value: 'not-array', path: '$', regions, compileSchema })).toBe('not-array');
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
        { title: 'Tab 2', key: 'tab2' }
      ];

      const result = normalize({ value: items, path: '$', regions, compileSchema });
      expect(result).toEqual(items);
    });

    it('extracts tab title schema into regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.tabs.items;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const items = [
        { title: { type: 'text', text: 'Dynamic Tab' }, key: 'tab1' }
      ];

      normalize({ value: items, path: '$', regions, compileSchema });

      expect(regions['items.0.title']).toBeDefined();
      expect(regions['items.0.title']?.key).toBe('items.0.title');
    });

    it('extracts tab body schema into regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.tabs.items;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const items = [
        { title: 'Tab 1', body: { type: 'text', text: 'Content' }, key: 'tab1' }
      ];

      normalize({ value: items, path: '$', regions, compileSchema });

      expect(regions['items.0.body']).toBeDefined();
    });

    it('extracts tab toolbar schema into regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.tabs.items;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const items = [
        { title: 'Tab 1', toolbar: { type: 'text', text: 'Tools' }, key: 'tab1' }
      ];

      normalize({ value: items, path: '$', regions, compileSchema });

      expect(regions['items.0.toolbar']).toBeDefined();
    });

    it('handles mixed items with and without schema regions', () => {
      const normalize = DEEP_FIELD_NORMALIZERS.tabs.items;
      const regions: Record<string, TemplateRegion> = {};
      const compileSchema = createMockCompileSchema();

      const items = [
        { title: 'Plain', key: 'tab1' },
        { title: { type: 'text', text: 'Dynamic' }, key: 'tab2', body: { type: 'text', text: 'Body' } }
      ];

      normalize({ value: items, path: '$', regions, compileSchema });

      expect(regions['items.0.title']).toBeUndefined();
      expect(regions['items.1.title']).toBeDefined();
      expect(regions['items.1.body']).toBeDefined();
    });
  });
});
