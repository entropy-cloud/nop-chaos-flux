import { describe, expect, it } from 'vitest';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { compileDataSource, isDataSourceFullyStatic } from './source-compiler.js';
import type { CompiledRuntimeValue, DataSourceSchema } from '@nop-chaos/flux-core';

function getStaticValue<T>(compiled: CompiledRuntimeValue<T> | undefined): T | undefined {
  if (!compiled) return undefined;
  if (compiled.isStatic) return compiled.value;
  return undefined;
}

describe('compileDataSource', () => {
  const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

  describe('action data source', () => {
    it('compiles a basic action data source with ajax', () => {
      const schema: DataSourceSchema = {
        type: 'data-source',
        name: 'users',
        action: 'ajax',
        args: {
          url: '/api/users',
          method: 'GET',
        },
      };

      const compiled = compileDataSource('ds-1', schema, expressionCompiler);

      expect(compiled.id).toBe('ds-1');
      expect(compiled.kind).toBe('action');
      expect(compiled.targetPath).toBeDefined();
      expect(compiled.targetPath?.isStatic).toBe(true);
      expect(getStaticValue(compiled.targetPath)).toBe('users');
      expect(compiled.action).toBeDefined();
      expect(compiled.action?.nodes[0]).toMatchObject({ action: 'ajax' });
      expect(compiled.action?.nodes[0].payload.args?.isStatic).toBe(true);
      expect(getStaticValue(compiled.action?.nodes[0].payload.args)).toEqual({
        url: '/api/users',
        method: 'GET',
      });
    });

    it('compiles action data source with expression in url', () => {
      const schema: DataSourceSchema = {
        type: 'data-source',
        action: 'ajax',
        args: {
          url: '${"/api/users/" + userId}',
        },
      };

      const compiled = compileDataSource('ds-2', schema, expressionCompiler);

      expect(compiled.action?.isFullyStatic).toBe(false);
      expect(compiled.action?.nodes[0].payload.args?.isStatic).toBe(false);
    });

    it('compiles action data source with interval and stopWhen', () => {
      const schema: DataSourceSchema = {
        type: 'data-source',
        action: 'ajax',
        args: {
          url: '/api/status',
        },
        interval: 5000,
        stopWhen: '${status === "complete"}',
      };

      const compiled = compileDataSource('ds-3', schema, expressionCompiler);

      expect(compiled.interval).toBeDefined();
      expect(compiled.interval?.isStatic).toBe(true);
      expect(getStaticValue(compiled.interval)).toBe(5000);
      expect(compiled.stopWhen).toBeDefined();
      expect(compiled.stopWhen?.isStatic).toBe(false);
    });
  });

  describe('formula data source', () => {
    it('compiles a formula data source with static value', () => {
      const schema: DataSourceSchema = {
        type: 'data-source',
        name: 'computed',
        formula: 42,
      };

      const compiled = compileDataSource('ds-4', schema, expressionCompiler);

      expect(compiled.id).toBe('ds-4');
      expect(compiled.kind).toBe('formula');
      expect(compiled.formula).toBeDefined();
      expect(compiled.formula?.isStatic).toBe(true);
      expect(getStaticValue(compiled.formula)).toBe(42);
    });

    it('compiles a formula data source with expression', () => {
      const schema: DataSourceSchema = {
        type: 'data-source',
        name: 'computed',
        formula: '${items.filter(i => i.active).length}',
      };

      const compiled = compileDataSource('ds-5', schema, expressionCompiler);

      expect(compiled.formula?.isStatic).toBe(false);
    });
  });

  describe('merge options', () => {
    it('compiles merge strategy and key', () => {
      const schema: DataSourceSchema = {
        type: 'data-source',
        action: 'ajax',
        args: {
          url: '/api/items',
        },
        mergeStrategy: 'upsert',
        mergeKey: 'id',
      };

      const compiled = compileDataSource('ds-6', schema, expressionCompiler);

      expect(compiled.mergeStrategy?.isStatic).toBe(true);
      expect(getStaticValue(compiled.mergeStrategy)).toBe('upsert');
      expect(compiled.mergeKey?.isStatic).toBe(true);
      expect(getStaticValue(compiled.mergeKey)).toBe('id');
    });

    it('compiles result mapping', () => {
      const schema: DataSourceSchema = {
        type: 'data-source',
        action: 'ajax',
        args: {
          url: '/api/data',
        },
        resultMapping: {
          items: 'data.rows',
          total: 'data.total',
        },
      };

      const compiled = compileDataSource('ds-7', schema, expressionCompiler);

      expect(compiled.resultMapping).toBeDefined();
      expect(compiled.resultMapping?.isStatic).toBe(true);
    });
  });

  describe('dependencies', () => {
    it('preserves dependsOn array', () => {
      const schema: DataSourceSchema = {
        type: 'data-source',
        action: 'ajax',
        args: {
          url: '/api/details',
        },
        dependsOn: ['users', 'config'],
      };

      const compiled = compileDataSource('ds-8', schema, expressionCompiler);

      expect(compiled.dependsOn).toEqual(['users', 'config']);
    });
  });

  describe('isDataSourceFullyStatic', () => {
    it('returns true for fully static data source', () => {
      const schema: DataSourceSchema = {
        type: 'data-source',
        name: 'static',
        formula: 'hello',
      };

      const compiled = compileDataSource('ds-9', schema, expressionCompiler);

      expect(isDataSourceFullyStatic(compiled)).toBe(true);
    });

    it('returns false when formula has expression', () => {
      const schema: DataSourceSchema = {
        type: 'data-source',
        name: 'dynamic',
        formula: '${name}',
      };

      const compiled = compileDataSource('ds-10', schema, expressionCompiler);

      expect(isDataSourceFullyStatic(compiled)).toBe(false);
    });

    it('returns false when action args url has expression', () => {
      const schema: DataSourceSchema = {
        type: 'data-source',
        action: 'ajax',
        args: {
          url: '${baseUrl + "/users"}',
        },
      };

      const compiled = compileDataSource('ds-11', schema, expressionCompiler);

      expect(isDataSourceFullyStatic(compiled)).toBe(false);
    });
  });
});
