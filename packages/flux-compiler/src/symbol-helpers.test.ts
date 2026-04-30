import { describe, expect, it } from 'vitest';
import type { PreparedImportSpec, SchemaInput, XuiImportSpec } from '@nop-chaos/flux-core';
import { createCompileSymbolTable } from './compile-symbol-table';
import {
  pushImportSymbols,
  normalizeImportSpecKey,
  collectSchemaImportSpecs,
  pushPreparedImportSymbols,
  pushInjectedLocalSymbols,
  pushRegionParamSymbols,
} from './schema-compiler/symbol-helpers';

describe('symbol-helpers', () => {
  describe('pushImportSymbols', () => {
    it('returns unchanged table for non-array imports', () => {
      const table = createCompileSymbolTable();
      const result = pushImportSymbols(table, 'not-array' as unknown as XuiImportSpec[], 'test');
      expect(result).toBe(table);
    });

    it('returns unchanged table for empty array', () => {
      const table = createCompileSymbolTable();
      const result = pushImportSymbols(table, [], 'test');
      expect(result).toBe(table);
    });

    it('returns unchanged table when no spec has "as"', () => {
      const table = createCompileSymbolTable();
      const result = pushImportSymbols(table, [{ from: 'lib' } as XuiImportSpec], 'test');
      expect(result).toBe(table);
    });

    it('pushes import symbols for specs with "as"', () => {
      const table = createCompileSymbolTable();
      const result = pushImportSymbols(
        table,
        [
          { from: 'lib1', as: 'lib' },
          { from: 'lib2', as: 'util' },
        ],
        'test-imports',
      );

      expect(result.resolve('$lib')).toEqual({ name: '$lib', kind: 'import-alias' });
      expect(result.resolve('$util')).toEqual({ name: '$util', kind: 'import-alias' });
    });

    it('skips specs without "as" in mixed array', () => {
      const table = createCompileSymbolTable();
      const result = pushImportSymbols(
        table,
        [{ from: 'lib1', as: 'lib' }, { from: 'lib2' } as XuiImportSpec],
        'test',
      );

      expect(result.resolve('$lib')).toBeDefined();
    });
  });

  describe('normalizeImportSpecKey', () => {
    it('produces deterministic key from spec', () => {
      const spec: XuiImportSpec = { from: 'demo-lib', as: 'demo' };
      const key = normalizeImportSpecKey('test://schema.json', spec);

      expect(key).toBe(
        JSON.stringify({
          schemaUrl: 'test://schema.json',
          from: 'demo-lib',
          as: 'demo',
          options: null,
        }),
      );
    });

    it('includes options in key when present', () => {
      const spec: XuiImportSpec = { from: 'lib', as: 'myLib', options: { mode: 'lazy' } };
      const key = normalizeImportSpecKey('schema.json', spec);

      expect(key).toContain('"mode":"lazy"');
    });

    it('produces different keys for different specs', () => {
      const spec1: XuiImportSpec = { from: 'lib', as: 'a' };
      const spec2: XuiImportSpec = { from: 'lib', as: 'b' };

      expect(normalizeImportSpecKey('url', spec1)).not.toBe(normalizeImportSpecKey('url', spec2));
    });
  });

  describe('collectSchemaImportSpecs', () => {
    it('returns empty for non-object input', () => {
      expect(collectSchemaImportSpecs({ type: 'text' } as SchemaInput, 'url')).toEqual([]);
    });

    it('returns empty for object without xui:imports', () => {
      expect(collectSchemaImportSpecs({ type: 'text' } as SchemaInput, 'url')).toEqual([]);
    });

    it('collects valid import specs', () => {
      const result = collectSchemaImportSpecs(
        {
          type: 'page',
          'xui:imports': [
            { from: 'demo-lib', as: 'demo' },
            { from: 'util-lib', as: 'util' },
          ],
        } as unknown as SchemaInput,
        'test://schema.json',
      );

      expect(result).toHaveLength(2);
      expect(result.map((s) => s.as)).toEqual(['demo', 'util']);
    });

    it('skips invalid import specs', () => {
      const result = collectSchemaImportSpecs(
        {
          type: 'page',
          'xui:imports': [
            null as unknown as XuiImportSpec,
            'string-entry' as unknown as XuiImportSpec,
            { from: 'lib' } as XuiImportSpec,
            { as: 'demo' } as XuiImportSpec,
            { from: 'valid-lib', as: 'valid' },
          ],
        } as unknown as SchemaInput,
        'url',
      );

      expect(result).toHaveLength(1);
      expect(result[0].as).toBe('valid');
    });

    it('deduplicates specs with same key', () => {
      const result = collectSchemaImportSpecs(
        {
          type: 'page',
          body: {
            type: 'container',
            'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
          },
          'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
        } as unknown as SchemaInput,
        'url',
      );

      expect(result).toHaveLength(1);
    });

    it('traverses array children', () => {
      const result = collectSchemaImportSpecs(
        {
          type: 'page',
          body: [
            {
              type: 'container',
              'xui:imports': [{ from: 'lib-a', as: 'a' }],
            },
            {
              type: 'container',
              'xui:imports': [{ from: 'lib-b', as: 'b' }],
            },
          ],
        } as unknown as SchemaInput,
        'url',
      );

      expect(result).toHaveLength(2);
    });

    it('traverses deeply nested objects', () => {
      const result = collectSchemaImportSpecs(
        {
          type: 'page',
          body: {
            type: 'container',
            body: {
              type: 'panel',
              'xui:imports': [{ from: 'deep-lib', as: 'deep' }],
            },
          },
        } as unknown as SchemaInput,
        'url',
      );

      expect(result).toHaveLength(1);
      expect(result[0].as).toBe('deep');
    });

    it('skips non-array xui:imports', () => {
      const result = collectSchemaImportSpecs(
        {
          type: 'page',
          'xui:imports': 'not-an-array',
        } as unknown as SchemaInput,
        'url',
      );

      expect(result).toEqual([]);
    });
  });

  describe('pushPreparedImportSymbols', () => {
    it('returns unchanged table when imports is empty', () => {
      const table = createCompileSymbolTable();
      const result = pushPreparedImportSymbols(table, [], undefined, 'url', 'id');
      expect(result).toBe(table);
    });

    it('returns unchanged table when schemaUrl is undefined', () => {
      const table = createCompileSymbolTable();
      const result = pushPreparedImportSymbols(
        table,
        [{ from: 'lib', as: 'demo' }],
        undefined,
        undefined,
        'id',
      );
      expect(result).toBe(table);
    });

    it('pushes symbols with member info from prepared imports', () => {
      const table = createCompileSymbolTable();
      const spec: XuiImportSpec = { from: 'demo-lib', as: 'demo' };
      const prepared: PreparedImportSpec = {
        schemaUrl: 'url',
        spec,
        resolvedSpec: spec,
        staticMeta: {
          helpers: {
            formatName: { kind: 'function', params: [{ name: 'first' }] },
          },
        },
      };
      const preparedImports = new Map([[normalizeImportSpecKey('url', spec), prepared]]);

      const result = pushPreparedImportSymbols(table, [spec], preparedImports, 'url', 'test-id');

      const symbol = result.resolve('$demo');
      expect(symbol).toBeDefined();
      expect(symbol?.kind).toBe('import-alias');
      expect(symbol?.members).toEqual(['formatName']);
    });

    it('pushes symbols without member info when no staticMeta', () => {
      const table = createCompileSymbolTable();
      const spec: XuiImportSpec = { from: 'demo-lib', as: 'demo' };
      const prepared: PreparedImportSpec = {
        schemaUrl: 'url',
        spec,
        resolvedSpec: spec,
      };
      const preparedImports = new Map([[normalizeImportSpecKey('url', spec), prepared]]);

      const result = pushPreparedImportSymbols(table, [spec], preparedImports, 'url', 'id');

      const symbol = result.resolve('$demo');
      expect(symbol).toBeDefined();
      expect(symbol?.members).toBeUndefined();
    });
  });

  describe('pushInjectedLocalSymbols', () => {
    it('returns unchanged table when renderer has no injectedLocals', () => {
      const table = createCompileSymbolTable();
      const result = pushInjectedLocalSymbols(
        table,
        {
          type: 'text',
          component: () => null,
        },
        'id',
      );

      expect(result).toBe(table);
    });

    it('returns unchanged table when injectedLocals is empty', () => {
      const table = createCompileSymbolTable();
      const result = pushInjectedLocalSymbols(
        table,
        {
          type: 'text',
          component: () => null,
          injectedLocals: {},
        },
        'id',
      );

      expect(result).toBe(table);
    });

    it('pushes injected locals as symbols', () => {
      const table = createCompileSymbolTable();
      const result = pushInjectedLocalSymbols(
        table,
        {
          type: 'text',
          component: () => null,
          injectedLocals: {
            $record: { kind: 'import-alias' as const },
          },
        },
        'owner-symbols',
      );

      expect(result.resolve('$record')).toBeDefined();
      expect(result.resolve('$record')?.kind).toBe('import-alias');
    });
  });

  describe('pushRegionParamSymbols', () => {
    it('returns unchanged table when params is empty', () => {
      const table = createCompileSymbolTable();
      const result = pushRegionParamSymbols(table, [], 'id');
      expect(result).toBe(table);
    });

    it('returns unchanged table when params is undefined', () => {
      const table = createCompileSymbolTable();
      const result = pushRegionParamSymbols(table, undefined, 'id');
      expect(result).toBe(table);
    });

    it('pushes slot symbol with params as members', () => {
      const table = createCompileSymbolTable();
      const result = pushRegionParamSymbols(table, ['record', 'index'], 'region-id');

      const slot = result.resolve('$slot');
      expect(slot).toBeDefined();
      expect(slot?.kind).toBe('slot-root');
      expect(slot?.members).toEqual(['record', 'index', '$parent']);
    });
  });
});
