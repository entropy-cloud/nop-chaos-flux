import { describe, expect, it } from 'vitest';
import {
  isVariableSourceRef,
  isFuncSourceRef,
  isSQLSchemaSourceRef,
  resolveVariables,
  resolveFunctions,
  resolveTables,
  getDefaultLineNumbers,
  getDefaultAutoHeight,
  getDefaultHeight,
} from './types';
import type { VariableItem, FuncGroup, TableSchema, ExpressionEditorConfig, SQLEditorConfig } from './types';

describe('type guards', () => {
  it('isVariableSourceRef returns true for source refs', () => {
    expect(isVariableSourceRef({ source: 'scope', scopePath: 'vars' })).toBe(true);
    expect(isVariableSourceRef({ source: 'api', api: { url: '/api' } as any })).toBe(true);
    expect(isVariableSourceRef([{ label: 'x', value: 'x' }])).toBe(false);
    expect(isVariableSourceRef(undefined)).toBe(false);
    expect(isVariableSourceRef(null)).toBe(false);
  });

  it('isFuncSourceRef returns true for source refs', () => {
    expect(isFuncSourceRef({ source: 'builtin', builtinSet: ['math'] })).toBe(true);
    expect(isFuncSourceRef([{ groupName: 'Logic', items: [] }])).toBe(false);
  });

  it('isSQLSchemaSourceRef returns true for source refs', () => {
    expect(isSQLSchemaSourceRef({ source: 'api', api: { url: '/api/schema' } as any })).toBe(true);
    expect(isSQLSchemaSourceRef([{ name: 'users', columns: [] }])).toBe(false);
  });
});

describe('resolveVariables', () => {
  const variables: VariableItem[] = [
    { label: 'Name', value: 'data.name', type: 'string' },
    { label: 'Age', value: 'data.age', type: 'number' },
  ];

  it('returns variables from inline config', () => {
    const config: ExpressionEditorConfig = { variables };
    expect(resolveVariables(config)).toEqual(variables);
  });

  it('returns empty for source ref', () => {
    const config: ExpressionEditorConfig = {
      variables: { source: 'scope', scopePath: 'vars' },
    };
    expect(resolveVariables(config)).toEqual([]);
  });

  it('returns empty for undefined config', () => {
    expect(resolveVariables(undefined)).toEqual([]);
  });

  it('returns empty when no variables', () => {
    expect(resolveVariables({})).toEqual([]);
  });
});

describe('resolveFunctions', () => {
  const functions: FuncGroup[] = [
    { groupName: 'Logic', items: [{ name: 'IF', description: 'Conditional' }] },
  ];

  it('returns functions from inline config', () => {
    const config: ExpressionEditorConfig = { functions };
    expect(resolveFunctions(config)).toEqual(functions);
  });

  it('returns empty for source ref', () => {
    const config: ExpressionEditorConfig = {
      functions: { source: 'builtin', builtinSet: ['math'] },
    };
    expect(resolveFunctions(config)).toEqual([]);
  });
});

describe('resolveTables', () => {
  const tables: TableSchema[] = [
    { name: 'users', columns: [{ name: 'id', type: 'BIGINT' }] },
  ];

  it('returns tables from inline config', () => {
    const config: SQLEditorConfig = { tables };
    expect(resolveTables(config)).toEqual(tables);
  });

  it('returns empty for source ref', () => {
    const config: SQLEditorConfig = {
      tables: { source: 'api', api: { url: '/api/schema' } as any },
    };
    expect(resolveTables(config)).toEqual([]);
  });
});

describe('defaults', () => {
  it('getDefaultLineNumbers is false for expression, true otherwise', () => {
    expect(getDefaultLineNumbers('expression')).toBe(false);
    expect(getDefaultLineNumbers('sql')).toBe(true);
    expect(getDefaultLineNumbers('json')).toBe(true);
    expect(getDefaultLineNumbers('javascript')).toBe(true);
  });

  it('getDefaultAutoHeight is true for expression, false otherwise', () => {
    expect(getDefaultAutoHeight('expression')).toBe(true);
    expect(getDefaultAutoHeight('sql')).toBe(false);
    expect(getDefaultAutoHeight('plaintext')).toBe(false);
  });

  it('getDefaultHeight returns auto for expression, 300 otherwise', () => {
    expect(getDefaultHeight('expression')).toBe('auto');
    expect(getDefaultHeight('sql')).toBe(300);
    expect(getDefaultHeight('json')).toBe(300);
  });
});
